import { useEffect } from 'react';
import { kmhToMps, type CircuitRaceState, type RemoteBike } from '@/domain';
import type { CircuitController } from '../../race/CircuitController';
import type { CircuitView } from '../../viewModels/circuit';
import { recordRoomMatch } from '../../stats/matchRecorder';
import { remoteRiders, useRoomStore, type RoomFinish } from './roomStore';
import { withRemoteRiders } from './withRemoteRiders';

/** How often your position goes to the room, ms (~10 a second). */
const POSE_EVERY_MS = 100;
/** After the winner's flag, everyone else has this long to finish, s. */
export const ROOM_FINISH_WINDOW_S = 15;

let lastPoseAt = -Infinity;
/** The room race already written to the match history. */
let recordedRaceId: number | null = null;

/**
 * Race time (since lights out) the finish window closes: the first flag plus
 * the window. Everyone works it out from the same reported finish times, so
 * every player agrees who made it.
 */
export function roomDeadlineS(finishes: Readonly<Record<string, RoomFinish>>): number | null {
  const times = Object.values(finishes).map((f) => f.timeS);
  return times.length ? Math.min(...times) + ROOM_FINISH_WINDOW_S : null;
}

/**
 * In a friend room: the host's start starts this race, Space doesn't, and the
 * window ends it. Outside a room, `otherwise` decides when time's up.
 */
export function useCircuitRoom(
  controller: CircuitController,
  enabled: boolean,
  otherwise: (race: CircuitRaceState) => boolean = () => false,
): void {
  const raceId = useRoomStore((s) => s.race?.raceId ?? null);
  useEffect(() => {
    controller.setRoomMode(enabled);
    controller.setRemoteBikes(enabled ? roomBikes : () => []);
    controller.setOutOfTime((race) => {
      if (!enabled) return otherwise(race);
      const deadline = roomDeadlineS(useRoomStore.getState().finishes);
      return deadline !== null && race.clockS - race.lightsOutAtS >= deadline;
    });
  }, [controller, enabled, otherwise]);
  useEffect(() => {
    if (!enabled || raceId === null) return;
    const { race, players, me } = useRoomStore.getState();
    // Everyone sees the same players in the same order, so the slots agree.
    const slot = Math.max(
      0,
      players.findIndex((p) => p.id === me?.id),
    );
    if (race) controller.startRoomRace(race.holdS, slot, Math.max(1, players.length));
  }, [controller, enabled, raceId]);
}

/** Where the other players' bikes are right now (as drawn), to bump into. */
function roomBikes(): RemoteBike[] {
  const room = useRoomStore.getState();
  if (room.status !== 'racing' || !room.me) return [];
  const myId = room.me.id;
  const others = room.players.filter((p) => p.id !== myId);
  return remoteRiders.sample(others, performance.now()).map(({ player, pose }) => ({
    x: pose.x,
    z: pose.z,
    heading: pose.heading,
    speedMps: kmhToMps(pose.speedKmh),
    id: player.id,
    progressM: pose.progressM,
  }));
}

/**
 * Every frame of a room race: send where you are (throttled) and when you
 * finish, add everyone else's bikes, run the finish window, and file the
 * race in the match history once it's decided for everyone.
 */
export function roomFrame(view: CircuitView): CircuitView {
  const room = useRoomStore.getState();
  if (room.status !== 'racing' || !room.me || !room.race) return view;
  const me = view.riders[0];
  const now = performance.now();
  if (me && now - lastPoseAt >= POSE_EVERY_MS) {
    lastPoseAt = now;
    room.sendPose({
      x: me.x,
      z: me.z,
      heading: me.heading,
      lean: me.lean,
      speedKmh: me.speedKmh,
      rpm: me.rpm,
      progressM: me.progressM,
      crashed: me.hit,
      bestLapS: me.bestLapS,
      finishTimeS: me.finishTimeS,
    });
  }
  if (me && me.finishTimeS !== null) room.sendFinish(me.finishTimeS, me.bestLapS);

  const deadlineS = roomDeadlineS(room.finishes);
  const closed = deadlineS !== null && view.raceTimeS >= deadlineS;
  const myId = room.me.id;
  const remotes = remoteRiders.sample(
    room.players.filter((p) => p.id !== myId),
    now,
  );
  const merged = withRemoteRiders(view, remotes, room.finishes, { deadlineS, closed });
  const meDone = view.phase === 'finished';
  const riders = merged.riders.map((r, i) =>
    i === 0 && meDone && r.finishTimeS === null ? { ...r, dnf: true } : r,
  );
  const othersDone = riders.slice(1).every((r) => r.finishTimeS !== null || r.dnf);
  const roomOver = meDone && othersDone;
  const result: CircuitView = {
    ...merged,
    riders,
    finishCountdownS:
      deadlineS !== null && !closed ? Math.max(0, deadlineS - view.raceTimeS) : null,
    roomOver,
  };
  if (roomOver && recordedRaceId !== room.race.raceId) {
    recordedRaceId = room.race.raceId;
    recordRoomMatch(result, room.settings, { label: room.me.bike, manual: room.me.manual });
  }
  return result;
}

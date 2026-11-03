import { useEffect } from 'react';
import type { CircuitController } from '../../race/CircuitController';
import type { CircuitView } from '../../viewModels/circuit';
import { remoteRiders, useRoomStore } from './roomStore';
import { withRemoteRiders } from './withRemoteRiders';

/** How often your position goes to the room, ms (~10 a second). */
const POSE_EVERY_MS = 100;
let lastPoseAt = -Infinity;

/** In a friend room: the host's start starts this race, and Space doesn't. */
export function useCircuitRoom(controller: CircuitController, enabled: boolean): void {
  const raceId = useRoomStore((s) => s.race?.raceId ?? null);
  useEffect(() => controller.setRoomMode(enabled), [controller, enabled]);
  useEffect(() => {
    if (!enabled || raceId === null) return;
    const race = useRoomStore.getState().race;
    if (race) controller.startRoomRace(race.holdS);
  }, [controller, enabled, raceId]);
}

/**
 * Every frame of a room race: send where you are (throttled) and when you
 * finish, and add everyone else's bikes to what's shown.
 */
export function roomFrame(view: CircuitView): CircuitView {
  const room = useRoomStore.getState();
  if (room.status !== 'racing' || !room.me) return view;
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
      crashed: me.crashed,
      bestLapS: me.bestLapS,
      finishTimeS: me.finishTimeS,
    });
  }
  if (me && me.finishTimeS !== null) room.sendFinish(me.finishTimeS, me.bestLapS);
  const myId = room.me.id;
  const remotes = remoteRiders.sample(
    room.players.filter((p) => p.id !== myId),
    now,
  );
  return withRemoteRiders(view, remotes, room.finishes);
}

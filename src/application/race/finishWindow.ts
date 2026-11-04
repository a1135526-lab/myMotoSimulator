import type { CircuitRaceState } from '@/domain';
import { ROOM_FINISH_WINDOW_S } from '../online/room/circuitRoom';
import type { CircuitView } from '../viewModels/circuit';

/**
 * Ranked against the AI runs the same clock as a room: once anyone takes the
 * flag, everyone else has ROOM_FINISH_WINDOW_S to follow, then the race ends.
 */

/** Race time (since lights out) the window closes; null before the first flag. */
function deadlineS(race: CircuitRaceState): number | null {
  const flags = race.riders.flatMap((r) => (r.finishedAtS === null ? [] : [r.finishedAtS]));
  return flags.length ? Math.min(...flags) - race.lightsOutAtS + ROOM_FINISH_WINDOW_S : null;
}

/** For CircuitController.setOutOfTime: the window has closed. */
export function finishWindowClosed(race: CircuitRaceState): boolean {
  const deadline = deadlineS(race);
  return deadline !== null && race.clockS - race.lightsOutAtS >= deadline;
}

/** The countdown on screen, and anyone still out when it ends marked unfinished. */
export function withFinishWindow(view: CircuitView): CircuitView {
  const flags = view.riders.flatMap((r) => (r.finishTimeS === null ? [] : [r.finishTimeS]));
  if (!flags.length) return view;
  const deadline = Math.min(...flags) + ROOM_FINISH_WINDOW_S;
  const over = view.phase === 'finished';
  return {
    ...view,
    finishCountdownS: over ? null : Math.max(0, deadline - view.raceTimeS),
    riders: over
      ? view.riders.map((r) => (r.finishTimeS === null ? { ...r, dnf: true } : r))
      : view.riders,
  };
}

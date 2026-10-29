import { NEUTRAL_INPUT } from '../simulation/inputShaping';
import type { SimInput, SimState } from '../simulation/types';
import { mpsToKmh } from '../units';

/**
 * Distance the bike must roll before it "leaves the stage beam". Real
 * strips use ~18 cm; elapsed time (ET) starts here, reaction time ends here.
 */
export const STAGE_BEAM_M = 0.2;

export interface RacerState {
  readonly sim: SimState;
  /** Last shaped input (player) or AI input (opponent). */
  readonly input: SimInput;
  /** Race-clock time the bike broke the stage beam. */
  readonly leftAtS: number | null;
  /** Race-clock time the bike crossed the finish line. */
  readonly finishedAtS: number | null;
  readonly trapSpeedKmh: number | null;
  /** Left before the green light. */
  readonly falseStart: boolean;
}

export const createRacer = (sim: SimState, input: SimInput = NEUTRAL_INPUT): RacerState => ({
  sim,
  input,
  leftAtS: null,
  finishedAtS: null,
  trapSpeedKmh: null,
  falseStart: false,
});

/** Linear interpolation of the clock time at which `distance` crossed `mark`. */
const crossingTime = (t0: number, d0: number, t1: number, d1: number, mark: number) =>
  d1 === d0 ? t1 : t0 + ((mark - d0) / (d1 - d0)) * (t1 - t0);

/**
 * Record stage-beam and finish-line crossings between two physics steps.
 * `clock0` / `clock1` are race-clock times of `prev` and `next`.
 */
export function updateMarks(
  racer: RacerState,
  prev: SimState,
  next: SimState,
  clock0: number,
  clock1: number,
  greenAtS: number,
  distanceM: number,
): RacerState {
  let { leftAtS, finishedAtS, trapSpeedKmh, falseStart } = racer;

  if (leftAtS === null && next.distanceM >= STAGE_BEAM_M) {
    leftAtS = crossingTime(clock0, prev.distanceM, clock1, next.distanceM, STAGE_BEAM_M);
    falseStart = leftAtS < greenAtS;
  }
  if (finishedAtS === null && next.distanceM >= distanceM) {
    finishedAtS = crossingTime(clock0, prev.distanceM, clock1, next.distanceM, distanceM);
    trapSpeedKmh = mpsToKmh(next.speedMps);
  }
  return { ...racer, sim: next, leftAtS, finishedAtS, trapSpeedKmh, falseStart };
}

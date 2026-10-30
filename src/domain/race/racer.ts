import { NEUTRAL_INPUT } from '../simulation/inputShaping';
import type { SimInput, SimState } from '../simulation/types';
import { mpsToKmh } from '../units';
import { isJumpStart, launchIntent } from './reaction';

/**
 * Distance the bike must roll before it "leaves the stage beam". Real
 * strips use ~18 cm; elapsed time (ET) starts here, reaction time ends here.
 */
export const STAGE_BEAM_M = 0.2;

export interface RacerState {
  readonly sim: SimState;
  /** Last shaped input (player) or AI input (opponent). */
  readonly input: SimInput;
  /** Race-clock time the rider first asked the bike to go (see reaction.ts). */
  readonly launchAtS: number | null;
  /** Race-clock time the bike broke the stage beam. */
  readonly leftAtS: number | null;
  /** Race-clock time the bike crossed the finish line. */
  readonly finishedAtS: number | null;
  readonly trapSpeedKmh: number | null;
  /** Launched before green, or quicker after it than a human can react. */
  readonly falseStart: boolean;
}

export const createRacer = (sim: SimState, input: SimInput = NEUTRAL_INPUT): RacerState => ({
  sim,
  input,
  launchAtS: null,
  leftAtS: null,
  finishedAtS: null,
  trapSpeedKmh: null,
  falseStart: false,
});

/** Note the first launch request; a launch the rider can't have reacted to is a false start. */
export function markLaunch(
  racer: RacerState,
  input: SimInput,
  clockS: number,
  greenAtS: number,
): RacerState {
  if (racer.launchAtS !== null || !launchIntent(input, racer.sim)) return racer;
  return {
    ...racer,
    launchAtS: clockS,
    falseStart: racer.falseStart || isJumpStart(clockS, greenAtS),
  };
}

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
    falseStart ||= leftAtS < greenAtS;
  }
  if (finishedAtS === null && next.distanceM >= distanceM) {
    finishedAtS = crossingTime(clock0, prev.distanceM, clock1, next.distanceM, distanceM);
    trapSpeedKmh = mpsToKmh(next.speedMps);
  }
  return { ...racer, sim: next, leftAtS, finishedAtS, trapSpeedKmh, falseStart };
}

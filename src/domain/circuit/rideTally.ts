import { shouldUpshift } from '../dyno/autoRider';
import type { SimModel } from '../simulation/model';
import type { SimState } from '../simulation/types';
import type { CircuitRider } from './rider';

/**
 * What the player did during a race, counted step by step, for the grades
 * shown at the flag (rideGrades.ts). Only the racing part counts: from the
 * lights going out to the player's own flag.
 */
export interface RideTally {
  readonly racingS: number;
  /** Time with the bike off the tarmac, s, and how many times it left. */
  readonly offTrackS: number;
  readonly excursions: number;
  /** Hard hits (barrier or another bike) and R-key resets. */
  readonly hits: number;
  readonly resets: number;
  /** Slides held long enough and ridden out on the tarmac. */
  readonly drifts: number;
  /** The slide going on now: how long it's been held, s, and whether it's still clean. */
  readonly slideS: number;
  readonly slideClean: boolean;
  /** Manual upshifts, and those made near the best shift point. */
  readonly upshifts: number;
  readonly goodUpshifts: number;
  /** Time spent on the rev limiter, s. */
  readonly limiterS: number;
  /** Corners ridden, and the sum over them of your slowest speed against a pro's. */
  readonly corners: number;
  readonly cornerPace: number;
  /** Fastest since the last corner, m/s: a pro can't take a corner faster than your bike gets there. */
  readonly peakMps: number;
  /** The corner you're in: your slowest speed and the pro's there, m/s (null on a straight). */
  readonly corner: { readonly minMps: number; readonly refMps: number } | null;
}

export const EMPTY_TALLY: RideTally = {
  racingS: 0,
  offTrackS: 0,
  excursions: 0,
  hits: 0,
  resets: 0,
  drifts: 0,
  slideS: 0,
  slideClean: true,
  upshifts: 0,
  goodUpshifts: 0,
  limiterS: 0,
  corners: 0,
  cornerPace: 0,
  peakMps: 0,
  corner: null,
};

/** A slide counts from this much drift, held at least DRIFT_HELD_S. */
const DRIFT_COUNT_MIN = 0.6;
export const DRIFT_HELD_S = 0.4;
/** Being faster than the reference in a corner earns no more than this. */
const MAX_PACE = 1.1;
/** An upshift up to this much before the best point still counts as good. */
const EARLY_SHIFT_SLACK = 1.08;

/** One physics step of the player: `before` → `after` (after contacts). */
export function stepTally(
  tally: RideTally,
  before: CircuitRider,
  after: CircuitRider,
  /** A pro's speed here, m/s, while in a corner; null on a straight. */
  refMps: number | null,
  dtS: number,
): RideTally {
  const off = after.surface !== 'track';
  const hit = after.hitAtS !== before.hitAtS;
  const sliding = Math.abs(after.drift) >= DRIFT_COUNT_MIN;
  let { slideS, slideClean, drifts } = tally;
  if (sliding) {
    slideS += dtS;
    slideClean = slideClean && !off && !hit;
  } else if (slideS > 0) {
    if (slideS >= DRIFT_HELD_S && slideClean && !off && !hit) drifts += 1;
    slideS = 0;
    slideClean = true;
  }
  return {
    ...tally,
    ...cornerPace(tally, after.sim.speedMps, refMps),
    racingS: tally.racingS + dtS,
    offTrackS: tally.offTrackS + (off ? dtS : 0),
    excursions: tally.excursions + (off && before.surface === 'track' ? 1 : 0),
    hits: tally.hits + (hit ? 1 : 0),
    drifts,
    slideS,
    slideClean,
    limiterS: tally.limiterS + (after.sim.revLimiterActive ? dtS : 0),
  };
}

/** Each corner is judged on its slowest point: yours against a pro's. */
function cornerPace(
  tally: RideTally,
  v: number,
  refMps: number | null,
): Pick<RideTally, 'corners' | 'cornerPace' | 'peakMps' | 'corner'> {
  const { corners, peakMps, corner } = tally;
  if (refMps !== null) {
    const now = corner ?? { minMps: v, refMps };
    return {
      corners,
      cornerPace: tally.cornerPace,
      peakMps,
      corner: { minMps: Math.min(now.minMps, v), refMps: Math.min(now.refMps, refMps) },
    };
  }
  if (!corner)
    return { corners, cornerPace: tally.cornerPace, peakMps: Math.max(peakMps, v), corner };
  const ref = Math.max(1, Math.min(corner.refMps, peakMps));
  return {
    corners: corners + 1,
    cornerPace: tally.cornerPace + Math.min(MAX_PACE, corner.minMps / ref),
    peakMps: v,
    corner: null,
  };
}

/** A manual shift by the player, judged against the best shift point. */
export function tallyShift(
  tally: RideTally,
  model: SimModel,
  sim: SimState,
  dir: 1 | -1,
): RideTally {
  const d = model.drivetrain;
  const gear = sim.gear ?? 0;
  if (dir < 0 || d.kind !== 'manual' || gear < 1) return tally;
  const good = shouldUpshift(model, d, gear, sim.engineRpm * EARLY_SHIFT_SLACK);
  return {
    ...tally,
    upshifts: tally.upshifts + 1,
    goodUpshifts: tally.goodUpshifts + (good ? 1 : 0),
  };
}

export const tallyReset = (tally: RideTally): RideTally => ({
  ...tally,
  resets: tally.resets + 1,
  slideS: 0,
  slideClean: true,
});

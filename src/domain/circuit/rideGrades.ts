import { clamp } from '../units';
import type { SimModel } from '../simulation/model';
import type { CircuitRaceState } from './circuitRace';
import type { RideTally } from './rideTally';

/**
 * Grades for a race, S (best) to E, worked out from the tally. Each part is
 * scored 0–100; the overall grade is their weighted average. A part that
 * doesn't apply (shifting on an automatic, consistency over one lap) is left out.
 */
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

export type ScoreKey =
  'cornering' | 'limits' | 'clean' | 'drift' | 'shifting' | 'launch' | 'consistency';

export interface ScoreItem {
  readonly key: ScoreKey;
  readonly score: number;
  readonly grade: Grade;
}

export interface RideGrades {
  readonly score: number;
  readonly grade: Grade;
  readonly items: readonly ScoreItem[];
  /** The counts behind them, for the details. */
  readonly tally: RideTally;
}

export interface RideFacts {
  readonly tally: RideTally;
  readonly lapTimesS: readonly number[];
  /** Lights out → launch, s (null if the rider never went). */
  readonly reactionS: number | null;
  readonly jumpStart: boolean;
  /** The rider shifted by hand (a manual bike without auto shift). */
  readonly manualShift: boolean;
}

const GRADE_FLOORS: readonly (readonly [Grade, number])[] = [
  ['S', 90],
  ['A', 80],
  ['B', 65],
  ['C', 50],
  ['D', 35],
];

export const gradeOf = (score: number): Grade =>
  GRADE_FLOORS.find(([, floor]) => score >= floor)?.[0] ?? 'E';

const WEIGHTS: Readonly<Record<ScoreKey, number>> = {
  cornering: 3,
  limits: 1.5,
  clean: 1,
  consistency: 1,
  shifting: 1,
  launch: 0.5,
  drift: 0.5,
};

/** Corner pace against a pro's line: 75 % of it scores nothing, matching it scores 100. */
const PACE_ZERO = 0.75;
const PACE_FULL = 1;
/** Track limits: points lost per share of the race off the tarmac, and per trip off a lap. */
const OFF_SHARE_COST = 600;
const EXCURSION_COST = 10;
const RESET_COST = 15;
const HIT_COST = 15;
/** Drifts: score with none, and gained per clean slide a lap. */
const DRIFT_BASE = 30;
const DRIFT_PER_LAP = 35;
/** Rev limiter: points lost per share of the race spent on it. */
const LIMITER_SHARE_COST = 300;
/** Launch: a reaction this quick or better scores 100; each further second costs this much. */
const LAUNCH_BEST_S = 0.2;
const LAUNCH_COST_PER_S = 150;
/** Consistency: points lost per unit of lap-time spread (std / mean). */
const SPREAD_COST = 2000;

const score = (v: number) => Math.round(clamp(v, 0, 100));

function consistency(lapTimesS: readonly number[]): number | null {
  // The first lap starts from the grid, so it's always slower.
  const flying = lapTimesS.slice(1);
  if (flying.length < 2) return null;
  const mean = flying.reduce((a, b) => a + b, 0) / flying.length;
  const variance = flying.reduce((a, b) => a + (b - mean) ** 2, 0) / flying.length;
  return score(100 - (Math.sqrt(variance) / mean) * SPREAD_COST);
}

function launch(reactionS: number | null, jumpStart: boolean): number | null {
  if (jumpStart) return 0;
  if (reactionS === null) return null;
  return score(100 - Math.max(0, reactionS - LAUNCH_BEST_S) * LAUNCH_COST_PER_S);
}

export function rideScores(facts: RideFacts): Partial<Record<ScoreKey, number>> {
  const t = facts.tally;
  const laps = Math.max(1, facts.lapTimesS.length);
  const racing = Math.max(1, t.racingS);
  const pace = t.corners > 0 ? t.cornerPace / t.corners : null;
  const scores: Partial<Record<ScoreKey, number | null>> = {
    cornering: pace === null ? null : score(((pace - PACE_ZERO) / (PACE_FULL - PACE_ZERO)) * 100),
    limits: score(
      100 -
        (t.offTrackS / racing) * OFF_SHARE_COST -
        (t.excursions / laps) * EXCURSION_COST -
        t.resets * RESET_COST,
    ),
    clean: score(100 - t.hits * HIT_COST),
    drift: score(DRIFT_BASE + (t.drifts / laps) * DRIFT_PER_LAP),
    shifting:
      facts.manualShift && t.upshifts > 0
        ? score((t.goodUpshifts / t.upshifts) * 100 - (t.limiterS / racing) * LIMITER_SHARE_COST)
        : null,
    launch: launch(facts.reactionS, facts.jumpStart),
    consistency: consistency(facts.lapTimesS),
  };
  return Object.fromEntries(
    Object.entries(scores).filter((e): e is [ScoreKey, number] => typeof e[1] === 'number'),
  );
}

export function rideGrades(facts: RideFacts): RideGrades {
  const scores = rideScores(facts);
  const items = (Object.keys(WEIGHTS) as ScoreKey[]).flatMap((key) => {
    const s = scores[key];
    return s === undefined ? [] : [{ key, score: s, grade: gradeOf(s) }];
  });
  const weight = items.reduce((a, i) => a + WEIGHTS[i.key], 0);
  const total = weight > 0 ? items.reduce((a, i) => a + i.score * WEIGHTS[i.key], 0) / weight : 0;
  const overall = Math.round(total);
  return { score: overall, grade: gradeOf(overall), items, tally: facts.tally };
}

/** Grades for the player's race so far (shown once they take the flag). */
export function circuitGrades(race: CircuitRaceState, model: SimModel): RideGrades {
  const player = race.riders[0];
  return rideGrades({
    tally: race.tally,
    lapTimesS: player?.lapTimesS ?? [],
    reactionS: race.playerLaunchAtS === null ? null : race.playerLaunchAtS - race.lightsOutAtS,
    jumpStart: race.penaltyUntilS !== null,
    manualShift: model.drivetrain.kind === 'manual' && !race.settings.autoShift,
  });
}

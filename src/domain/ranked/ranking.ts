import type { CircuitSkill } from '../circuit/circuitAi';
import { humanReaction } from '../race/reaction';

/**
 * Ranked racing: points, the tiers they buy, and how hard the AI rides at
 * each tier. The same point table is applied on the server
 * (supabase/004_ranked.sql), which is what actually keeps the score.
 */

export type RankedGroup = 'scooter' | 'manual';

export interface Tier {
  readonly id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  readonly name: string;
  /** Points at which this tier starts. */
  readonly min: number;
  readonly color: string;
}

export const TIERS: readonly Tier[] = [
  { id: 'bronze', name: '青銅', min: 0, color: '#c07a46' },
  { id: 'silver', name: '白銀', min: 100, color: '#b8c4cf' },
  { id: 'gold', name: '黃金', min: 250, color: '#f2c14e' },
  { id: 'platinum', name: '白金', min: 450, color: '#59d2c2' },
  { id: 'diamond', name: '鑽石', min: 700, color: '#7fb4ff' },
  { id: 'master', name: '大師', min: 1000, color: '#c78bff' },
];

/** The tier for a points total, its index (0 = bronze) and progress to the next. */
export function tierOf(points: number) {
  let index = 0;
  for (let i = 0; i < TIERS.length; i++) if (points >= (TIERS[i] as Tier).min) index = i;
  const tier = TIERS[index] as Tier;
  const next = TIERS[index + 1] ?? null;
  return {
    index,
    tier,
    next,
    /** 0–1 of the way to the next tier (1 at the top). */
    progress: next ? (points - tier.min) / (next.min - tier.min) : 1,
  };
}

/**
 * Points for a finishing place in a field of `field` riders. A DNF counts as
 * last. Races against the AI count half, so the ladder is climbed by racing
 * people.
 */
const TABLE: Readonly<Record<number, readonly number[]>> = {
  2: [24, -18],
  3: [28, 4, -16],
  4: [30, 12, -6, -18],
};

export function rankedDelta(position: number, field: number, vsAi: boolean): number {
  const row = TABLE[Math.min(4, Math.max(2, field))] ?? TABLE[4];
  const place = Math.min(Math.max(1, position), row?.length ?? 1);
  const full = row?.[place - 1] ?? 0;
  return vsAi ? Math.trunc(full / 2) : full;
}

/** Points never drop below zero. */
export const applyDelta = (points: number, delta: number) => Math.max(0, points + delta);

/**
 * The AI rides harder the higher you're ranked — but only a little each
 * tier: from a touch under "average" at bronze to just short of "pro" at
 * master, in even steps.
 */
const AI_LOW: CircuitSkill = { cornerGripUse: 0.72, brakeGripUse: 0.62, reactionS: 0.23 };
const AI_HIGH: CircuitSkill = { cornerGripUse: 0.87, brakeGripUse: 0.83, reactionS: 0.18 };

export function rankedAiSkill(tierIndex: number): CircuitSkill {
  const f = Math.min(1, Math.max(0, tierIndex / (TIERS.length - 1)));
  const lerp = (a: number, b: number) => a + (b - a) * f;
  return {
    cornerGripUse: lerp(AI_LOW.cornerGripUse, AI_HIGH.cornerGripUse),
    brakeGripUse: lerp(AI_LOW.brakeGripUse, AI_HIGH.brakeGripUse),
    reactionS: humanReaction(lerp(AI_LOW.reactionS, AI_HIGH.reactionS)),
  };
}

/** Each group races one stock bike, so ranked races are about riding. */
export const RANKED_BIKES: Readonly<Record<RankedGroup, string>> = {
  scooter: 'sym-jet-sl-125',
  manual: 'kawasaki-ninja-400',
};

export const RANKED_GROUP_LABELS: Readonly<Record<RankedGroup, string>> = {
  scooter: '速克達組',
  manual: '打檔車組',
};

export const RANKED_LAPS = 2;
export const RANKED_CIRCUITS = [
  'practice-park',
  'hill-town',
  'south-bay',
  'harbor-night',
  'sugar-mill',
  'lotus-lake',
  'cloud-peak',
  'gorge-run',
  'cape-coast',
  'lake-ridge',
  'kart-oval',
  'neon-streets',
  'rift-valley',
  'dragon-ridge',
  'roller-hills',
  'cliff-coast',
  'midnight-pass',
] as const;
/** Opponents in a race against the AI (a full grid of four). */
export const RANKED_AI_OPPONENTS = 3;

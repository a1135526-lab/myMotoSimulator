import { CIRCUIT_SKILLS, type CircuitSkill } from '../circuit/circuitAi';
import { humanReaction } from '../race/reaction';
import { rankedAiSkill } from './ranking';

/**
 * Ranked races against the AI come in four difficulties, picked before
 * queueing. The harder the AI, the more a good place is worth; a bad place
 * costs the same at every level. The same table is applied on the server
 * (supabase/009_ranked_difficulty.sql), which is what keeps the score.
 */
export type RankedDifficulty = 'easy' | 'normal' | 'hard' | 'max';

export interface DifficultyInfo {
  readonly id: RankedDifficulty;
  readonly label: string;
  /** Share of a race-against-people gain you get for a good place, in percent. */
  readonly gainPct: number;
  readonly blurb: string;
}

export const RANKED_DIFFICULTIES: readonly DifficultyInfo[] = [
  { id: 'easy', label: '簡單', gainPct: 25, blurb: '電腦騎得保守' },
  { id: 'normal', label: '普通', gainPct: 50, blurb: '電腦隨你的段位稍微變強' },
  { id: 'hard', label: '困難', gainPct: 75, blurb: '電腦是職業車手' },
  { id: 'max', label: '極限', gainPct: 100, blurb: '完全不放水：每台電腦都用到抓地力極限' },
];

/** Losses against the AI, at every difficulty, in percent of the people table. */
export const AI_LOSS_PCT = 50;

export const isRankedDifficulty = (v: unknown): v is RankedDifficulty =>
  RANKED_DIFFICULTIES.some((d) => d.id === v);

export const difficultyInfo = (d: RankedDifficulty): DifficultyInfo =>
  RANKED_DIFFICULTIES.find((x) => x.id === d) ?? (RANKED_DIFFICULTIES[1] as DifficultyInfo);

/** Points against the AI from the people table's `full` value for that place. */
export const aiPoints = (full: number, d: RankedDifficulty): number =>
  Math.trunc((full * (full > 0 ? difficultyInfo(d).gainPct : AI_LOSS_PCT)) / 100);

const EASY: CircuitSkill = { cornerGripUse: 0.66, brakeGripUse: 0.56, reactionS: 0.25 };
/** Flat out: right at the grip cap, the quickest reaction a person could have. */
const ALL_OUT: CircuitSkill = {
  cornerGripUse: 0.94,
  brakeGripUse: 0.94,
  reactionS: humanReaction(0),
};

export interface RankedAi {
  readonly skill: CircuitSkill;
  /**
   * Every AI rider at exactly this skill: no slower "personalities" on the
   * grid, nothing given away.
   */
  readonly allOut: boolean;
}

/** How the AI rides at a difficulty (normal still follows your tier). */
export function rankedAi(d: RankedDifficulty, tierIndex: number): RankedAi {
  switch (d) {
    case 'easy':
      return { skill: EASY, allOut: false };
    case 'hard':
      return { skill: CIRCUIT_SKILLS.pro, allOut: false };
    case 'max':
      return { skill: ALL_OUT, allOut: true };
    default:
      return { skill: rankedAiSkill(tierIndex), allOut: false };
  }
}

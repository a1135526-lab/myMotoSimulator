import { describe, expect, it } from 'vitest';
import { CIRCUIT_SKILLS } from '../circuit/circuitAi';
import { RANKED_DIFFICULTIES, rankedAi } from './difficulty';
import { rankedAiSkill, rankedDelta } from './ranking';

describe('ranked difficulty', () => {
  it('the harder the AI, the more a win is worth; losses cost the same', () => {
    const wins = RANKED_DIFFICULTIES.map((d) => rankedDelta(1, 4, true, d.id));
    expect(wins).toEqual([7, 15, 22, 30]);
    for (const d of RANKED_DIFFICULTIES) {
      expect(rankedDelta(2, 4, true, d.id)).toBeGreaterThan(0);
      expect(rankedDelta(3, 4, true, d.id)).toBe(-3);
      expect(rankedDelta(4, 4, true, d.id)).toBe(-9);
    }
    // The flat-out AI is worth as much as a race against people, never more.
    expect(rankedDelta(1, 4, true, 'max')).toBe(rankedDelta(1, 4, false));
  });

  it('normal is the old rule: half points, AI following your tier', () => {
    expect(rankedDelta(1, 4, true)).toBe(15);
    expect(rankedDelta(1, 4, true, 'normal')).toBe(15);
    expect(rankedAi('normal', 3).skill).toEqual(rankedAiSkill(3));
  });

  it('each level rides harder, and max gives nothing away', () => {
    const grip = RANKED_DIFFICULTIES.map((d) => rankedAi(d.id, 5).skill.cornerGripUse);
    for (let i = 1; i < grip.length; i++) {
      expect(grip[i]).toBeGreaterThanOrEqual(grip[i - 1] ?? 0);
    }
    const max = rankedAi('max', 0);
    expect(max.allOut).toBe(true);
    expect(max.skill.cornerGripUse).toBeGreaterThan(CIRCUIT_SKILLS.pro.cornerGripUse);
    expect(max.skill.brakeGripUse).toBeGreaterThan(CIRCUIT_SKILLS.pro.brakeGripUse);
    expect(max.skill.reactionS).toBeLessThan(CIRCUIT_SKILLS.pro.reactionS);
    expect(rankedAi('hard', 0).allOut).toBe(false);
  });
});

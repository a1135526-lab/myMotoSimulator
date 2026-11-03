import { describe, expect, it } from 'vitest';
import { CIRCUIT_SKILLS } from '../circuit/circuitAi';
import { applyDelta, rankedAiSkill, rankedDelta, tierOf, TIERS } from './ranking';

describe('ranked tiers', () => {
  it('points map to a tier and the way to the next', () => {
    expect(tierOf(0).tier.name).toBe('青銅');
    expect(tierOf(99).tier.name).toBe('青銅');
    expect(tierOf(100).tier.name).toBe('白銀');
    expect(tierOf(175).progress).toBeCloseTo(0.5);
    expect(tierOf(5000)).toMatchObject({ index: TIERS.length - 1, next: null, progress: 1 });
  });

  it('winning gains, losing costs; racing the AI counts half', () => {
    expect(rankedDelta(1, 4, false)).toBe(30);
    expect(rankedDelta(4, 4, false)).toBe(-18);
    expect(rankedDelta(1, 2, false)).toBe(24);
    expect(rankedDelta(1, 4, true)).toBe(15);
    expect(rankedDelta(4, 4, true)).toBe(-9);
    // A DNF reported past last place is still last.
    expect(rankedDelta(9, 3, false)).toBe(-16);
    expect(applyDelta(5, -18)).toBe(0);
  });

  it('the AI gets a little stronger each tier, never past pro or below novice', () => {
    const skills = TIERS.map((_, i) => rankedAiSkill(i));
    for (let i = 1; i < skills.length; i++) {
      const step = (skills[i]?.cornerGripUse ?? 0) - (skills[i - 1]?.cornerGripUse ?? 0);
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(0.04); // small steps between tiers
    }
    const first = skills[0];
    const last = skills[skills.length - 1];
    expect(first?.cornerGripUse).toBeGreaterThan(CIRCUIT_SKILLS.novice.cornerGripUse);
    expect(last?.cornerGripUse).toBeLessThan(CIRCUIT_SKILLS.pro.cornerGripUse);
    expect(last?.reactionS).toBeLessThan(first?.reactionS ?? 0);
  });
});

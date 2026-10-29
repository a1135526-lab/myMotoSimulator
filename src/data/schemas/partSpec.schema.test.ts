import { describe, expect, it } from 'vitest';
import { parsePartSpec, PartSpecSchema } from './partSpec.schema';

const estimated = { verified: false, kind: 'estimated', sources: [] } as const;
const base = { name: 'Part', compatibleBikeIds: 'all', provenance: estimated } as const;

describe('PartSpecSchema', () => {
  it('accepts each category', () => {
    const parts = [
      { category: 'rollerSet', massG: 11 },
      { category: 'variator', lowRatioFactor: 1.03, highRatioFactor: 0.94 },
      { category: 'torqueSpring', stiffnessFactor: 1.1 },
      { category: 'clutchSpring', engageRpmOffset: 500 },
      { category: 'clutchBell', diameterOffsetMm: 0, massFactor: 0.7 },
      { category: 'ecu', torqueGain: [{ rpm: 6000, gain: 1.05 }], revLimitOffsetRpm: 500 },
      { category: 'finalDrive', ratioFactor: 1.05 },
      { category: 'intakeExhaust', torqueGain: [] },
    ];
    for (const [i, part] of parts.entries()) {
      const result = PartSpecSchema.safeParse({ id: `part-${i}`, ...base, ...part });
      expect(result.success, part.category).toBe(true);
    }
  });

  it('rejects unknown categories', () => {
    expect(PartSpecSchema.safeParse({ id: 'x', ...base, category: 'turbo' }).success).toBe(false);
  });

  it('rejects out-of-range factors with a readable error', () => {
    expect(() =>
      parsePartSpec({ id: 'silly-gear', ...base, category: 'finalDrive', ratioFactor: 3 }),
    ).toThrow(/Invalid PartSpec "silly-gear"/);
  });

  it('rejects absurd torque gains', () => {
    const result = PartSpecSchema.safeParse({
      id: 'ecu-x',
      ...base,
      category: 'ecu',
      torqueGain: [{ rpm: 6000, gain: 5 }],
      revLimitOffsetRpm: 0,
    });
    expect(result.success).toBe(false);
  });
});

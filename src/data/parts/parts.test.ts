import { describe, expect, it } from 'vitest';
import { PART_CATEGORIES, PartSpecSchema } from '../schemas';
import { findPart, PARTS, partsFor } from './index';

describe('part catalog', () => {
  it('validates every part', () => {
    for (const part of PARTS) expect(PartSpecSchema.safeParse(part).success, part.id).toBe(true);
  });

  it('offers at least one option per category', () => {
    for (const category of PART_CATEGORIES) {
      expect(
        partsFor(category, { id: 'sym-drg-158', kind: 'scooter' }).length,
        category,
      ).toBeGreaterThan(0);
    }
  });

  it('finds parts by category and id', () => {
    expect(findPart('ecu', 'ecu-stage-1')?.name).toBe('一階程式');
    expect(findPart('ecu', 'roller-13g')).toBeUndefined();
  });

  it('marks every generic part as an unverified estimate', () => {
    expect(PARTS.every((p) => !p.provenance.verified)).toBe(true);
  });
});

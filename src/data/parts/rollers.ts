import { GENERIC_ESTIMATE } from './common';

export const ROLLER_MASS_MIN_G = 6;
export const ROLLER_MASS_MAX_G = 24;
export const ROLLER_MASS_STEP_G = 0.5;

/** Whole-gram roller sets offered in the "整組" picker. */
export const ROLLER_SETS = Array.from(
  { length: ROLLER_MASS_MAX_G - ROLLER_MASS_MIN_G + 1 },
  (_, i) => {
    const massG = ROLLER_MASS_MIN_G + i;
    return {
      id: `roller-${massG}g`,
      name: `${massG} g`,
      category: 'rollerSet' as const,
      massG,
      compatibleBikeIds: 'all' as const,
      provenance: GENERIC_ESTIMATE,
    };
  },
);

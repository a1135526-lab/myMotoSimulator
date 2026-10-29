import type { BikeSpec, RiderSkill } from '@/domain';
import { getBike, ROLLER_MASS_MIN_G } from '@/data';
import { createStockSelection, type TuneSelection } from '../tuning/selection';

/**
 * Opponent "character": which bike, how modified, who's riding.
 * Tune levels map onto the regular part catalog so the opponent goes through
 * exactly the same physics as the player.
 */
export type TuneLevel = 'stock' | 'mild' | 'full';

export interface OpponentSetup {
  readonly bikeId: string;
  readonly tuneLevel: TuneLevel;
  readonly skill: RiderSkill;
  readonly riderMassKg: number;
}

export const TUNE_LEVEL_LABELS: Readonly<Record<TuneLevel, string>> = {
  stock: '原廠',
  mild: '輕改（一階 ECU、空濾）',
  full: '重改（二階 ECU、全段進排氣、傳動全改）',
};

export const SKILL_LABELS: Readonly<Record<RiderSkill, string>> = {
  novice: '新手：反應慢、早換檔',
  average: '一般：反應普通、拉到斷油才換',
  pro: '職業：反應快、最佳換檔點',
};

/** Roller grams to drop for each level (lighter = revs higher before shifting). */
const ROLLER_DROP_G: Readonly<Record<TuneLevel, number>> = { stock: 0, mild: 1, full: 2 };

export function selectionForLevel(
  bike: BikeSpec,
  level: TuneLevel,
  riderMassKg: number,
): TuneSelection {
  const stock = createStockSelection(bike);
  const base = { ...stock, riderMassKg };
  if (level === 'stock') return base;

  const drop = ROLLER_DROP_G[level];
  const rollerMassesG = stock.rollerMassesG.map((g) => Math.max(ROLLER_MASS_MIN_G, g - drop));
  const parts =
    level === 'mild'
      ? {
          ...stock.parts,
          ecu: 'ecu-stage-1',
          intakeExhaust: 'intake-high-flow-filter',
          clutchSpring:
            bike.kind === 'scooter' ? 'clutch-spring-plus-300' : stock.parts.clutchSpring,
        }
      : {
          ...stock.parts,
          ecu: 'ecu-stage-2',
          intakeExhaust: 'intake-exhaust-combo',
          ...(bike.kind === 'scooter' && {
            variator: 'variator-full-range',
            torqueSpring: 'torque-spring-plus-10',
            clutchSpring: 'clutch-spring-plus-600',
            clutchBell: 'clutch-bell-light',
          }),
        };
  return { ...base, rollerMassesG, parts };
}

export const defaultOpponent = (bikeId: string): OpponentSetup => ({
  bikeId,
  tuneLevel: 'stock',
  skill: 'average',
  riderMassKg: getBike(bikeId).chassis.defaultRiderMassKg,
});

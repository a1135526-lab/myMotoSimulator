import { z } from 'zod';
import type { BikeSpec, CvtTune, TuneSetup } from '@/domain';
import { createStockTune } from '@/domain';
import { categoryAppliesTo, findPart, STOCK_PART_ID, type PartCategory } from '@/data';

/** Categories chosen from the catalog by id. Rollers are edited per slot instead. */
export const SELECTABLE_CATEGORIES = [
  'variator',
  'torqueSpring',
  'clutchSpring',
  'clutchBell',
  'ecu',
  'finalDrive',
  'intakeExhaust',
] as const satisfies readonly Exclude<PartCategory, 'rollerSet'>[];
export type SelectableCategory = (typeof SELECTABLE_CATEGORIES)[number];

/** Categories the user can change on this bike (CVT parts only exist on scooters). */
export const categoriesFor = (bike: BikeSpec): SelectableCategory[] =>
  SELECTABLE_CATEGORIES.filter((c) => categoryAppliesTo(c, bike.kind));

/** What the user picked — ids and a few numbers. Serialisable for presets. */
export interface TuneSelection {
  /** Scooters only; empty for manual bikes. */
  readonly rollerMassesG: readonly number[];
  readonly parts: Readonly<Record<SelectableCategory, string>>;
  readonly riderMassKg: number;
  readonly extraMassKg: number;
}

export const TuneSelectionSchema = z.object({
  rollerMassesG: z.array(z.number().positive()).readonly(),
  parts: z.object(
    Object.fromEntries(SELECTABLE_CATEGORIES.map((c) => [c, z.string()])) as Record<
      SelectableCategory,
      z.ZodString
    >,
  ),
  riderMassKg: z.number().min(0).max(200),
  extraMassKg: z.number().min(-50).max(200),
});

const allStock = (): Record<SelectableCategory, string> =>
  Object.fromEntries(SELECTABLE_CATEGORIES.map((c) => [c, STOCK_PART_ID])) as Record<
    SelectableCategory,
    string
  >;

export function createStockSelection(bike: BikeSpec): TuneSelection {
  return {
    rollerMassesG:
      bike.kind === 'scooter'
        ? Array.from({ length: bike.cvt.rollers.count }, () => bike.cvt.rollers.massG)
        : [],
    parts: allStock(),
    riderMassKg: bike.chassis.defaultRiderMassKg,
    extraMassKg: 0,
  };
}

/** Is this category still on the stock part? */
export const isStock = (selection: TuneSelection, category: SelectableCategory): boolean =>
  selection.parts[category] === STOCK_PART_ID;

function resolveCvt(stock: CvtTune, selection: TuneSelection): CvtTune {
  const { parts } = selection;
  const variator = findPart('variator', parts.variator);
  const torqueSpring = findPart('torqueSpring', parts.torqueSpring);
  const clutchSpring = findPart('clutchSpring', parts.clutchSpring);
  const bell = findPart('clutchBell', parts.clutchBell);
  const rollersFit = selection.rollerMassesG.length === stock.rollerMassesG.length;

  return {
    rollerMassesG: rollersFit ? selection.rollerMassesG : stock.rollerMassesG,
    variator: {
      lowRatio: stock.variator.lowRatio * (variator?.lowRatioFactor ?? 1),
      highRatio: stock.variator.highRatio * (variator?.highRatioFactor ?? 1),
    },
    torqueSpringFactor: torqueSpring?.stiffnessFactor ?? 1,
    clutchEngageRpm: stock.clutchEngageRpm + (clutchSpring?.engageRpmOffset ?? 0),
    clutchBell: {
      diameterMm: stock.clutchBell.diameterMm + (bell?.diameterOffsetMm ?? 0),
      massKg: stock.clutchBell.massKg * (bell?.massFactor ?? 1),
    },
  };
}

/**
 * Turn the user's selection into the numeric TuneSetup the domain simulates.
 * Unknown ids (e.g. from an old preset) fall back to stock.
 */
export function resolveTune(bike: BikeSpec, selection: TuneSelection): TuneSetup {
  const stock = createStockTune(bike);
  const { parts } = selection;
  const ecu = findPart('ecu', parts.ecu);
  const finalDrive = findPart('finalDrive', parts.finalDrive);
  const intake = findPart('intakeExhaust', parts.intakeExhaust);

  return {
    cvt: stock.cvt && resolveCvt(stock.cvt, selection),
    ecu: {
      torqueGain: ecu?.torqueGain ?? stock.ecu.torqueGain,
      revLimitRpm: stock.ecu.revLimitRpm + (ecu?.revLimitOffsetRpm ?? 0),
    },
    intakeExhaustGain: intake?.torqueGain ?? stock.intakeExhaustGain,
    finalDriveRatio: stock.finalDriveRatio * (finalDrive?.ratioFactor ?? 1),
    riderMassKg: selection.riderMassKg,
    extraMassKg: selection.extraMassKg,
  };
}

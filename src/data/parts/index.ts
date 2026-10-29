import type { BikeKind, BikeSpec } from '@/domain';
import { parsePartSpec, type PartCategory, type PartOf, type PartSpec } from '../schemas';
import { CLUTCH_BELLS } from './clutchBells';
import { FINAL_DRIVES, VARIATORS } from './drivetrain';
import { ECU_MAPS } from './ecuMaps';
import { INTAKE_EXHAUST } from './intakeExhaust';
import { ROLLER_SETS } from './rollers';
import { CLUTCH_SPRINGS, TORQUE_SPRINGS } from './springs';

export { ROLLER_MASS_MAX_G, ROLLER_MASS_MIN_G, ROLLER_MASS_STEP_G } from './rollers';

/** Part catalog, validated at load time. Stock parts are implicit (id "stock"). */
export const PARTS: readonly PartSpec[] = [
  ...ROLLER_SETS,
  ...VARIATORS,
  ...TORQUE_SPRINGS,
  ...CLUTCH_SPRINGS,
  ...CLUTCH_BELLS,
  ...ECU_MAPS,
  ...FINAL_DRIVES,
  ...INTAKE_EXHAUST,
].map(parsePartSpec);

const seen = new Set<string>();
for (const part of PARTS) {
  if (seen.has(part.id)) throw new Error(`Duplicate part id "${part.id}"`);
  seen.add(part.id);
}

export const STOCK_PART_ID = 'stock';

/** Categories that only exist on a CVT; manual bikes never see them. */
export const CVT_ONLY_CATEGORIES: ReadonlySet<PartCategory> = new Set([
  'rollerSet',
  'variator',
  'torqueSpring',
  'clutchSpring',
  'clutchBell',
]);

export const categoryAppliesTo = (category: PartCategory, kind: BikeKind): boolean =>
  kind === 'scooter' || !CVT_ONLY_CATEGORIES.has(category);

export function partsFor<C extends PartCategory>(
  category: C,
  bike: Pick<BikeSpec, 'id' | 'kind'>,
): PartOf<C>[] {
  if (!categoryAppliesTo(category, bike.kind)) return [];
  return PARTS.filter(
    (p): p is PartOf<C> =>
      p.category === category &&
      (p.compatibleBikeIds === 'all' || p.compatibleBikeIds.includes(bike.id)),
  );
}

export function findPart<C extends PartCategory>(category: C, id: string): PartOf<C> | undefined {
  return PARTS.find((p): p is PartOf<C> => p.category === category && p.id === id);
}

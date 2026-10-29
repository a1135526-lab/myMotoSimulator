import { z } from 'zod';
import { formatIssues } from './bikeSpec.schema';
import { positive, ProvenanceSchema, TorqueGainCurveSchema } from './common.schema';

/**
 * Aftermarket part catalog entries. Stock parts are NOT listed here — they
 * are derived from each BikeSpec (see createStockTune in the domain).
 *
 * Parts are expressed *relative to stock* (factors / offsets) so one entry
 * works across bikes and never pretends to know an absolute value that the
 * stock spec itself only estimates. Rollers are the exception: their mass is
 * stamped on the part.
 */
const PartBase = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be kebab-case'),
  name: z.string().min(1),
  description: z.string().optional(),
  compatibleBikeIds: z.union([z.literal('all'), z.array(z.string()).min(1)]),
  provenance: ProvenanceSchema,
});

const factor = (min: number, max: number) => z.number().finite().min(min).max(max);

export const RollerSetPartSchema = PartBase.extend({
  category: z.literal('rollerSet'),
  massG: positive().max(30),
});

export const VariatorPartSchema = PartBase.extend({
  category: z.literal('variator'),
  /** Multiplies stock low ratio (>1 = shorter launch gearing). */
  lowRatioFactor: factor(0.8, 1.25),
  /** Multiplies stock high ratio (<1 = taller top ratio, more overdrive). */
  highRatioFactor: factor(0.8, 1.25),
});

export const TorqueSpringPartSchema = PartBase.extend({
  category: z.literal('torqueSpring'),
  /** Relative to stock: 1.0 = stock, 1.15 = +15 %. */
  stiffnessFactor: factor(0.5, 2),
});

export const ClutchSpringPartSchema = PartBase.extend({
  category: z.literal('clutchSpring'),
  /** Engagement rpm change vs stock. */
  engageRpmOffset: z.number().int().min(-1500).max(3000),
});

export const ClutchBellPartSchema = PartBase.extend({
  category: z.literal('clutchBell'),
  diameterOffsetMm: z.number().min(-10).max(10),
  massFactor: factor(0.4, 1.5),
});

export const EcuPartSchema = PartBase.extend({
  category: z.literal('ecu'),
  torqueGain: TorqueGainCurveSchema,
  revLimitOffsetRpm: z.number().int().min(-2000).max(3000),
});

export const FinalDrivePartSchema = PartBase.extend({
  category: z.literal('finalDrive'),
  ratioFactor: factor(0.8, 1.25),
});

export const IntakeExhaustPartSchema = PartBase.extend({
  category: z.literal('intakeExhaust'),
  torqueGain: TorqueGainCurveSchema,
});

export const PartSpecSchema = z.discriminatedUnion('category', [
  RollerSetPartSchema,
  VariatorPartSchema,
  TorqueSpringPartSchema,
  ClutchSpringPartSchema,
  ClutchBellPartSchema,
  EcuPartSchema,
  FinalDrivePartSchema,
  IntakeExhaustPartSchema,
]);

export type PartSpec = z.infer<typeof PartSpecSchema>;
export type PartCategory = PartSpec['category'];
export type PartOf<C extends PartCategory> = Extract<PartSpec, { category: C }>;

export const PART_CATEGORIES = [
  'rollerSet',
  'variator',
  'torqueSpring',
  'clutchSpring',
  'clutchBell',
  'ecu',
  'finalDrive',
  'intakeExhaust',
] as const satisfies readonly PartCategory[];

export function parsePartSpec(input: unknown): PartSpec {
  const result = PartSpecSchema.safeParse(input);
  if (!result.success) {
    const id =
      typeof input === 'object' && input !== null && 'id' in input ? String(input.id) : '?';
    throw new Error(`Invalid PartSpec "${id}":\n${formatIssues(result.error)}`);
  }
  return result.data;
}

import { z } from 'zod';
import type { BikeSpec, LicenseClass } from '@/domain';
import { nonNegative, positive, ProvenanceSchema, rpm, torqueCurveSchema } from './common.schema';

export const MIN_TORQUE_CURVE_POINTS = 15;
/** Torque curve must start at or below this rpm so launch is covered. */
export const TORQUE_CURVE_MAX_START_RPM = 1500;

/** Taiwanese plate class from displacement: 白牌 < 250 cc ≤ 黃牌 ≤ 550 cc < 紅牌. */
export function licenseClassFor(displacementCc: number): LicenseClass {
  if (displacementCc < 250) return 'white';
  if (displacementCc <= 550) return 'yellow';
  return 'red';
}

const EngineSchema = z.object({
  displacementCc: positive(),
  cylinders: z.number().int().min(1).max(6),
  compressionRatio: z.number().min(6).max(16),
  peakPower: z.object({ ps: positive(), rpm: rpm() }),
  peakTorque: z.object({ nm: positive(), rpm: rpm() }),
  torqueCurve: torqueCurveSchema(MIN_TORQUE_CURVE_POINTS),
  idleRpm: rpm(),
  revLimitRpm: rpm(),
  rotatingInertiaKgM2: positive(),
  provenance: ProvenanceSchema,
});

const CvtSchema = z.object({
  rollers: z.object({
    count: z.number().int().min(3).max(8),
    massG: positive(),
    diameterMm: positive(),
    widthMm: positive(),
  }),
  variator: z.object({ lowRatio: positive(), highRatio: positive() }),
  stockShiftRpm: rpm(),
  stockShiftEndRpm: rpm(),
  clutch: z.object({ engageRpm: rpm(), fullLockRpm: rpm() }),
  clutchBell: z.object({ diameterMm: positive(), massKg: positive() }),
  finalDriveRatio: positive(),
  provenance: ProvenanceSchema,
});

const GearboxSchema = z.object({
  primaryRatio: positive(),
  gearRatios: z.array(positive()).min(3).max(7).readonly(),
  finalDriveRatio: positive(),
  launchRpm: rpm(),
  provenance: ProvenanceSchema,
});

const TireSchema = z.object({
  widthMm: positive(),
  aspectRatio: z.number().min(30).max(100),
  rimDiameterInch: z.number().min(8).max(21),
});

const ChassisSchema = z.object({
  curbMassKg: positive(),
  defaultRiderMassKg: positive(),
  rearTire: TireSchema,
  dragAreaM2: positive(),
  rollingResistanceCoeff: z.number().min(0.005).max(0.05),
  wheelInertiaKgM2: nonNegative(),
  provenance: ProvenanceSchema,
});

const ReferencePerformanceSchema = z.object({
  topSpeedKmh: positive().optional(),
  zeroTo60S: positive().optional(),
  zeroTo100S: positive().optional(),
  zeroTo100mS: positive().optional(),
  zeroTo400mS: positive().optional(),
  provenance: ProvenanceSchema,
});

const ClusterSchema = z.object({
  layout: z.enum(['lcd-bar', 'round-lcd', 'analog-lcd', 'twin-analog', 'tft']),
  lcd: z.enum(['positive', 'negative']).optional(),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i, 'accent must be #rrggbb'),
  tachMaxRpm: positive().optional(),
  speedMaxKmh: positive().optional(),
});

const base = {
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be kebab-case'),
  brand: z.string().min(1),
  model: z.string().min(1),
  modelYear: z.number().int().min(1990).max(2100).optional(),
  licenseClass: z.enum(['white', 'yellow', 'red']),
  engine: EngineSchema,
  chassis: ChassisSchema,
  referencePerformance: ReferencePerformanceSchema.optional(),
  cluster: ClusterSchema.optional(),
};

type Issue = (path: (string | number)[], message: string) => void;

function checkEngine(bike: BikeSpec, issue: Issue) {
  const { engine } = bike;
  const first = engine.torqueCurve[0];
  const last = engine.torqueCurve[engine.torqueCurve.length - 1];
  if (first && first.rpm > TORQUE_CURVE_MAX_START_RPM) {
    issue(['engine', 'torqueCurve'], `must start at ≤ ${TORQUE_CURVE_MAX_START_RPM} rpm`);
  }
  if (last && last.rpm < engine.revLimitRpm) {
    issue(['engine', 'torqueCurve'], 'must extend to at least revLimitRpm');
  }
  if (engine.peakPower.rpm > engine.revLimitRpm || engine.peakTorque.rpm > engine.revLimitRpm) {
    issue(['engine'], 'peak power/torque rpm must be within revLimitRpm');
  }
  if (licenseClassFor(engine.displacementCc) !== bike.licenseClass) {
    issue(
      ['licenseClass'],
      `${engine.displacementCc} cc is "${licenseClassFor(engine.displacementCc)}"`,
    );
  }
}

function checkCvt(bike: Extract<BikeSpec, { kind: 'scooter' }>, issue: Issue) {
  const { engine, cvt } = bike;
  if (engine.idleRpm >= cvt.clutch.engageRpm) {
    issue(['cvt', 'clutch', 'engageRpm'], 'must be above idleRpm');
  }
  if (cvt.clutch.engageRpm >= cvt.clutch.fullLockRpm) {
    issue(['cvt', 'clutch', 'fullLockRpm'], 'must be above engageRpm');
  }
  if (cvt.variator.lowRatio <= cvt.variator.highRatio) {
    issue(['cvt', 'variator'], 'lowRatio must be greater than highRatio');
  }
  if (cvt.stockShiftRpm <= cvt.clutch.fullLockRpm || cvt.stockShiftRpm > engine.revLimitRpm) {
    issue(['cvt', 'stockShiftRpm'], 'must be between clutch fullLockRpm and revLimitRpm');
  }
  if (cvt.stockShiftEndRpm <= cvt.stockShiftRpm || cvt.stockShiftEndRpm > engine.revLimitRpm) {
    issue(['cvt', 'stockShiftEndRpm'], 'must be above stockShiftRpm and within revLimitRpm');
  }
}

function checkGearbox(bike: Extract<BikeSpec, { kind: 'manual' }>, issue: Issue) {
  const { engine, gearbox } = bike;
  gearbox.gearRatios.forEach((ratio, i) => {
    const prev = gearbox.gearRatios[i - 1];
    if (prev !== undefined && ratio >= prev) {
      issue(['gearbox', 'gearRatios', i], 'gear ratios must be strictly descending');
    }
  });
  if (gearbox.launchRpm <= engine.idleRpm || gearbox.launchRpm >= engine.revLimitRpm) {
    issue(['gearbox', 'launchRpm'], 'must be between idleRpm and revLimitRpm');
  }
}

export const BikeSpecSchema: z.ZodType<BikeSpec> = z
  .discriminatedUnion('kind', [
    z.object({ ...base, kind: z.literal('scooter'), cvt: CvtSchema }),
    z.object({ ...base, kind: z.literal('manual'), gearbox: GearboxSchema }),
  ])
  .superRefine((bike, ctx) => {
    const issue: Issue = (path, message) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    checkEngine(bike, issue);
    if (bike.kind === 'scooter') checkCvt(bike, issue);
    else checkGearbox(bike, issue);
  });

/** Parse and throw with a readable message; used when registering bike data. */
export function parseBikeSpec(input: unknown): BikeSpec {
  const result = BikeSpecSchema.safeParse(input);
  if (!result.success) {
    const id =
      typeof input === 'object' && input !== null && 'id' in input ? String(input.id) : '?';
    throw new Error(`Invalid BikeSpec "${id}":\n${formatIssues(result.error)}`);
  }
  return result.data;
}

export function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

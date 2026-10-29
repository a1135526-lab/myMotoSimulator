import { clamp, percentToFraction, STANDARD_GRAVITY } from '../units';

/** Peak deceleration with full brake input, m/s² (~0.8 g, ABS-limited). */
export const MAX_BRAKE_DECEL_MPS2 = 8;
/** Launch acceleration ceiling from rear grip / wheelie, in g. */
export const MAX_TRACTION_G = 1.0;

export const tractionLimitN = (body: { readonly massKg: number }): number =>
  MAX_TRACTION_G * body.massKg * STANDARD_GRAVITY;

export interface VehicleBody {
  /** Bike + rider + extra, kg. */
  readonly massKg: number;
  /** massKg + rotating inertia reflected to the wheel (wheels, clutch bell), kg. */
  readonly effectiveMassKg: number;
  readonly wheelRadiusM: number;
  readonly dragAreaM2: number;
  readonly rollingResistanceCoeff: number;
  readonly airDensity: number;
  readonly gradePercent: number;
}

/** Equivalent linear mass of a rotating part: I / r², scaled by its gear ratio². */
export const reflectedMassKg = (inertiaKgM2: number, ratioToWheel: number, wheelRadiusM: number) =>
  (inertiaKgM2 * ratioToWheel * ratioToWheel) / (wheelRadiusM * wheelRadiusM);

export const aeroDragN = (body: VehicleBody, speedMps: number): number =>
  0.5 * body.airDensity * body.dragAreaM2 * speedMps * speedMps;

export const rollingResistanceN = (body: VehicleBody): number =>
  body.rollingResistanceCoeff * body.massKg * STANDARD_GRAVITY * Math.cos(gradeAngle(body));

export const gradeForceN = (body: VehicleBody): number =>
  body.massKg * STANDARD_GRAVITY * Math.sin(gradeAngle(body));

export const brakeForceN = (body: VehicleBody, brake: number): number =>
  clamp(brake, 0, 1) * MAX_BRAKE_DECEL_MPS2 * body.massKg;

const gradeAngle = (body: VehicleBody): number => Math.atan(percentToFraction(body.gradePercent));

/**
 * Longitudinal equation of motion:
 *   F_drive − F_aero(½ρC_dAv²) − F_roll(C_rr·m·g) − F_grade − F_brake = m_eff · a
 *
 * Rolling resistance and brakes only oppose motion: with the bike stopped
 * they can hold it but never push it backwards (no reverse in this model).
 *
 * Drive force is capped at {@link MAX_TRACTION_G} × m·g: beyond that a real
 * bike spins the rear tyre or lifts the front wheel. The excess engine
 * torque is simply lost (tyre slip / wheelie are not modelled separately).
 */
export function longitudinalAccel(
  body: VehicleBody,
  speedMps: number,
  driveForceN: number,
  brake: number,
  extraMassKg = 0,
): number {
  const resisting = rollingResistanceN(body) + brakeForceN(body, brake);
  const drive = Math.min(driveForceN, tractionLimitN(body));
  const net = drive - aeroDragN(body, speedMps) - gradeForceN(body);
  const mass = body.effectiveMassKg + extraMassKg;

  if (speedMps <= 0 && net <= resisting) return 0;
  return (net - resisting) / mass;
}

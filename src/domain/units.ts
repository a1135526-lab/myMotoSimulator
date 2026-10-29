/**
 * Physical constants and unit conversions.
 *
 * Convention: the domain layer computes in SI units internally
 * (m, kg, s, N, N·m, W, rad/s). Display units (rpm, km/h, PS, kgf·m)
 * are converted only at the edges through the helpers below.
 */

/** Standard gravity, m/s². */
export const STANDARD_GRAVITY = 9.80665;

/** Air density at sea level, 15 °C (ISA), kg/m³. */
export const AIR_DENSITY_SEA_LEVEL = 1.225;

/** 1 metric horsepower (PS) in watts. */
export const WATTS_PER_PS = 735.49875;

/** 1 kgf·m in N·m. */
export const NM_PER_KGFM = STANDARD_GRAVITY;

const SECONDS_PER_MINUTE = 60;
const METERS_PER_KILOMETER = 1000;
const SECONDS_PER_HOUR = 3600;
const MM_PER_INCH = 25.4;
const MM_PER_METER = 1000;
const GRAMS_PER_KILOGRAM = 1000;
const PERCENT = 100;

// ---- Rotation ----
export const rpmToRadPerSec = (rpm: number): number => (rpm * 2 * Math.PI) / SECONDS_PER_MINUTE;
export const radPerSecToRpm = (radPerSec: number): number =>
  (radPerSec * SECONDS_PER_MINUTE) / (2 * Math.PI);

// ---- Speed ----
export const mpsToKmh = (mps: number): number => (mps * SECONDS_PER_HOUR) / METERS_PER_KILOMETER;
export const kmhToMps = (kmh: number): number => (kmh * METERS_PER_KILOMETER) / SECONDS_PER_HOUR;

// ---- Power ----
export const wattsToPs = (watts: number): number => watts / WATTS_PER_PS;
export const psToWatts = (ps: number): number => ps * WATTS_PER_PS;

/** Power (W) from torque (N·m) and angular speed (rpm). */
export const powerFromTorque = (torqueNm: number, rpm: number): number =>
  torqueNm * rpmToRadPerSec(rpm);

// ---- Torque ----
export const nmToKgfm = (nm: number): number => nm / NM_PER_KGFM;
export const kgfmToNm = (kgfm: number): number => kgfm * NM_PER_KGFM;

// ---- Length / mass ----
export const mmToM = (mm: number): number => mm / MM_PER_METER;
export const inchToMm = (inch: number): number => inch * MM_PER_INCH;
export const gramsToKg = (g: number): number => g / GRAMS_PER_KILOGRAM;

// ---- Misc ----
export const percentToFraction = (percent: number): number => percent / PERCENT;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

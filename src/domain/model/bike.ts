import type { Provenance } from './provenance';

/** One sample of the wide-open-throttle crank torque curve. */
export interface TorquePoint {
  readonly rpm: number;
  readonly torqueNm: number;
}

export interface EngineSpec {
  readonly displacementCc: number;
  /** Number of cylinders; sets the exhaust firing frequency (and the sound). */
  readonly cylinders: number;
  readonly compressionRatio: number;
  readonly peakPower: { readonly ps: number; readonly rpm: number };
  readonly peakTorque: { readonly nm: number; readonly rpm: number };
  /** WOT crank torque, ascending rpm, from ≤1500 rpm up to at least the rev limit. */
  readonly torqueCurve: readonly TorquePoint[];
  readonly idleRpm: number;
  /** Stock ECU fuel-cut rpm. */
  readonly revLimitRpm: number;
  /** Crank + flywheel/magneto + drive pulley, kg·m². */
  readonly rotatingInertiaKgM2: number;
  readonly provenance: Provenance;
}

export interface CvtSpec {
  readonly rollers: {
    readonly count: number;
    /** Stock mass of each roller, g. */
    readonly massG: number;
    readonly diameterMm: number;
    readonly widthMm: number;
  };
  /**
   * Primary (belt) ratio range, driven/drive.
   * lowRatio > highRatio (e.g. 2.6 → 0.8).
   */
  readonly variator: {
    readonly lowRatio: number;
    readonly highRatio: number;
  };
  /**
   * Engine rpm the variator holds while shifting at wide-open throttle with
   * stock rollers and stock torque spring. Calibration anchor for the
   * roller-vs-spring force balance.
   */
  readonly stockShiftRpm: number;
  /**
   * WOT engine rpm when the variator reaches its top ratio (end of the shift).
   * Together with stockShiftRpm this sets how much rpm climbs while shifting —
   * easy to read off a tachometer on a real bike.
   */
  readonly stockShiftEndRpm: number;
  readonly clutch: {
    /** rpm where the shoes first touch the bell (stock clutch springs). */
    readonly engageRpm: number;
    /** rpm where the clutch stops slipping under WOT load (stock springs). */
    readonly fullLockRpm: number;
  };
  readonly clutchBell: {
    readonly diameterMm: number;
    readonly massKg: number;
  };
  /** Secondary (gearbox) reduction, wheel-side. */
  readonly finalDriveRatio: number;
  readonly provenance: Provenance;
}

export interface TireSpec {
  readonly widthMm: number;
  /** Sidewall height as % of width (the "70" in 120/70-12). */
  readonly aspectRatio: number;
  readonly rimDiameterInch: number;
}

export interface ChassisSpec {
  /** Curb mass incl. fluids and fuel, kg. */
  readonly curbMassKg: number;
  readonly defaultRiderMassKg: number;
  readonly rearTire: TireSpec;
  /** Drag coefficient × frontal area (with rider), m². */
  readonly dragAreaM2: number;
  readonly rollingResistanceCoeff: number;
  /** Both wheels + tires + rear brake rotor, kg·m². */
  readonly wheelInertiaKgM2: number;
  readonly provenance: Provenance;
}

/** Published performance figures used to calibrate the stock simulation. */
export interface ReferencePerformance {
  readonly topSpeedKmh?: number;
  readonly zeroTo60S?: number;
  readonly zeroTo100S?: number;
  /** Distance sprints — Taiwanese makers usually publish 0–100 m, not 0–100 km/h. */
  readonly zeroTo100mS?: number;
  readonly zeroTo400mS?: number;
  readonly provenance: Provenance;
}

/**
 * Manual (sequential) gearbox with a lever-operated wet clutch.
 * Overall reduction in gear n = primaryRatio × gearRatios[n−1] × finalDriveRatio.
 */
export interface GearboxSpec {
  /** Crank → clutch basket reduction. */
  readonly primaryRatio: number;
  /** 1st … top gear, strictly descending. */
  readonly gearRatios: readonly number[];
  /** Rear sprocket ÷ front sprocket. */
  readonly finalDriveRatio: number;
  /** Engine rpm the dyno auto-rider holds before slipping the clutch at launch. */
  readonly launchRpm: number;
  readonly provenance: Provenance;
}

/**
 * Taiwanese plate class by displacement:
 * 白牌 < 250 cc, 黃牌 250–550 cc, 紅牌 > 550 cc.
 */
export type LicenseClass = 'white' | 'yellow' | 'red';
export type BikeKind = 'scooter' | 'manual';

interface BikeBase {
  /** kebab-case, e.g. "sym-drg-158". */
  readonly id: string;
  readonly brand: string;
  readonly model: string;
  readonly modelYear?: number;
  readonly licenseClass: LicenseClass;
  readonly engine: EngineSpec;
  readonly chassis: ChassisSpec;
  readonly referencePerformance?: ReferencePerformance;
}

export interface ScooterSpec extends BikeBase {
  readonly kind: 'scooter';
  readonly cvt: CvtSpec;
}

export interface ManualSpec extends BikeBase {
  readonly kind: 'manual';
  readonly gearbox: GearboxSpec;
}

export type BikeSpec = ScooterSpec | ManualSpec;

import type { BikeSpec, ScooterSpec } from './bike';

/**
 * Multiplicative torque correction vs rpm, linearly interpolated.
 * An empty curve means gain = 1.0 everywhere (stock).
 */
export interface GainPoint {
  readonly rpm: number;
  readonly gain: number;
}
export type TorqueGainCurve = readonly GainPoint[];

/** CVT-only tuning (scooters). */
export interface CvtTune {
  /** One entry per roller slot, g. Length must equal bike.cvt.rollers.count. */
  readonly rollerMassesG: readonly number[];
  readonly variator: {
    readonly lowRatio: number;
    readonly highRatio: number;
  };
  /** Torque (center) spring stiffness relative to stock; 1.0 = stock, 1.1 = +10 %. */
  readonly torqueSpringFactor: number;
  /** Clutch shoe spring expressed as engagement rpm, the way the aftermarket labels them. */
  readonly clutchEngageRpm: number;
  readonly clutchBell: {
    readonly diameterMm: number;
    readonly massKg: number;
  };
}

/**
 * Resolved numeric setup the simulator runs on.
 *
 * The domain never sees part catalogs or part ids — the application layer
 * resolves the user's selections into these numbers. Stock values come
 * from {@link createStockTune}.
 */
export interface TuneSetup {
  /** Present for scooters, null for manual bikes. */
  readonly cvt: CvtTune | null;
  readonly ecu: {
    readonly torqueGain: TorqueGainCurve;
    readonly revLimitRpm: number;
  };
  readonly intakeExhaustGain: TorqueGainCurve;
  /** Scooter: gearbox reduction. Manual: rear ÷ front sprocket. */
  readonly finalDriveRatio: number;
  readonly riderMassKg: number;
  /** Added (or removed, if negative) mass vs curb mass, kg. */
  readonly extraMassKg: number;
}

export const STOCK_GAIN: TorqueGainCurve = [];

export function createStockCvtTune(bike: ScooterSpec): CvtTune {
  const { cvt } = bike;
  return {
    rollerMassesG: Array.from({ length: cvt.rollers.count }, () => cvt.rollers.massG),
    variator: { lowRatio: cvt.variator.lowRatio, highRatio: cvt.variator.highRatio },
    torqueSpringFactor: 1,
    clutchEngageRpm: cvt.clutch.engageRpm,
    clutchBell: { diameterMm: cvt.clutchBell.diameterMm, massKg: cvt.clutchBell.massKg },
  };
}

export function createStockTune(bike: BikeSpec): TuneSetup {
  return {
    cvt: bike.kind === 'scooter' ? createStockCvtTune(bike) : null,
    ecu: { torqueGain: STOCK_GAIN, revLimitRpm: bike.engine.revLimitRpm },
    intakeExhaustGain: STOCK_GAIN,
    finalDriveRatio:
      bike.kind === 'scooter' ? bike.cvt.finalDriveRatio : bike.gearbox.finalDriveRatio,
    riderMassKg: bike.chassis.defaultRiderMassKg,
    extraMassKg: 0,
  };
}

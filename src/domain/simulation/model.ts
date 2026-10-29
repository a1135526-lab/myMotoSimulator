import type { EngineModel } from '../engine/engine';
import { wotTorqueAt } from '../engine/torqueCurve';
import type { ManualSpec, ScooterSpec } from '../model/bike';
import type { CvtTune, TuneSetup } from '../model/tune';
import { buildClutch, type ClutchModel } from '../transmission/clutch';
import { bellInertiaKgM2 } from '../transmission/clutchBell';
import { fullLoadShiftRpm, type VariatorModel } from '../transmission/variator';
import { reflectedMassKg, type VehicleBody } from '../vehicle/dynamics';
import { rollingRadiusM } from '../vehicle/tire';
import type { SimConfig } from './types';

/**
 * Manual clutch torque capacity at full engagement, as a multiple of peak
 * crank torque. Real wet clutches carry ~1.5–2× so they never slip when
 * released; less than that and hard launches would slip forever.
 */
export const MANUAL_CLUTCH_CAPACITY_FACTOR = 1.8;

export interface CvtDrivetrain {
  readonly kind: 'scooter';
  readonly variator: VariatorModel;
  readonly clutch: ClutchModel;
  readonly finalDriveRatio: number;
}

export interface ManualDrivetrain {
  readonly kind: 'manual';
  readonly gearRatios: readonly number[];
  /** primaryRatio × finalDriveRatio; multiply by a gear ratio for the overall reduction. */
  readonly fixedReduction: number;
  /** Crank-side torque the clutch carries when fully released, N·m. */
  readonly clutchCapacityNm: number;
  readonly launchRpm: number;
}

export type DrivetrainModel = CvtDrivetrain | ManualDrivetrain;

/**
 * Everything the step function needs, precomputed once per configuration so
 * the 240 Hz loop does no allocation or spec lookups.
 */
export interface SimModel {
  readonly config: SimConfig;
  readonly timestepS: number;
  readonly engine: EngineModel;
  readonly drivetrain: DrivetrainModel;
  readonly body: VehicleBody;
}

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

function buildCvt(bike: ScooterSpec, cvtTune: CvtTune, finalDriveRatio: number): CvtDrivetrain {
  const { cvt, engine } = bike;
  return {
    kind: 'scooter',
    finalDriveRatio,
    variator: {
      lowRatio: cvtTune.variator.lowRatio,
      highRatio: cvtTune.variator.highRatio,
      fullLoadShiftRpm: fullLoadShiftRpm({
        stockShiftRpm: cvt.stockShiftRpm,
        stockRollerTotalG: cvt.rollers.massG * cvt.rollers.count,
        rollerTotalG: sum(cvtTune.rollerMassesG),
        torqueSpringFactor: cvtTune.torqueSpringFactor,
      }),
      // Rollers and spring scale the whole shift band, so the relative rise is a
      // property of the ramp and stays as measured on the stock bike.
      shiftRise: cvt.stockShiftEndRpm / cvt.stockShiftRpm - 1,
    },
    // Clutch capacity is sized from the *stock* engine at the stock lock rpm,
    // so a stronger ECU map makes the clutch slip to a higher rpm — as in reality.
    clutch: buildClutch({
      engageRpm: cvtTune.clutchEngageRpm,
      lockSpanRpm: cvt.clutch.fullLockRpm - cvt.clutch.engageRpm,
      lowRatio: cvtTune.variator.lowRatio,
      designShoeTorqueNm:
        wotTorqueAt(engine.torqueCurve, cvt.clutch.fullLockRpm) * cvt.variator.lowRatio,
      bellDiameterScale: cvtTune.clutchBell.diameterMm / cvt.clutchBell.diameterMm,
    }),
  };
}

function buildManual(bike: ManualSpec, tune: TuneSetup): ManualDrivetrain {
  const { gearbox, engine } = bike;
  return {
    kind: 'manual',
    gearRatios: gearbox.gearRatios,
    fixedReduction: gearbox.primaryRatio * tune.finalDriveRatio,
    clutchCapacityNm: engine.peakTorque.nm * MANUAL_CLUTCH_CAPACITY_FACTOR,
    launchRpm: gearbox.launchRpm,
  };
}

export function buildModel(config: SimConfig): SimModel {
  const { bike, tune, environment } = config;
  const { chassis, engine } = bike;

  const wheelRadiusM = rollingRadiusM(chassis.rearTire);
  const massKg = chassis.curbMassKg + tune.riderMassKg + tune.extraMassKg;
  // A scooter's clutch bell spins with the rear wheel through the gearbox.
  const bellInertia = tune.cvt
    ? bellInertiaKgM2(tune.cvt.clutchBell.diameterMm, tune.cvt.clutchBell.massKg)
    : 0;
  const effectiveMassKg =
    massKg +
    reflectedMassKg(chassis.wheelInertiaKgM2, 1, wheelRadiusM) +
    reflectedMassKg(bellInertia, tune.finalDriveRatio, wheelRadiusM);

  let drivetrain: DrivetrainModel;
  if (bike.kind === 'scooter') {
    if (!tune.cvt) throw new Error(`Scooter "${bike.id}" needs a CVT tune`);
    drivetrain = buildCvt(bike, tune.cvt, tune.finalDriveRatio);
  } else {
    drivetrain = buildManual(bike, tune);
  }

  return {
    config,
    timestepS: config.timestepS,
    engine: {
      torqueCurve: engine.torqueCurve,
      ecuGain: tune.ecu.torqueGain,
      intakeExhaustGain: tune.intakeExhaustGain,
      idleRpm: engine.idleRpm,
      revLimitRpm: tune.ecu.revLimitRpm,
      inertiaKgM2: engine.rotatingInertiaKgM2,
    },
    drivetrain,
    body: {
      massKg,
      effectiveMassKg,
      wheelRadiusM,
      dragAreaM2: chassis.dragAreaM2,
      rollingResistanceCoeff: chassis.rollingResistanceCoeff,
      airDensity: environment.airDensity,
      gradePercent: environment.gradePercent,
    },
  };
}

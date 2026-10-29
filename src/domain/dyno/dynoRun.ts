import { tunedWotTorqueNm } from '../engine/engine';
import { DRIVETRAIN_EFFICIENCY } from '../transmission/finalDrive';
import { shiftGear } from '../simulation/controls';
import { buildModel, type SimModel } from '../simulation/model';
import { armTimer, updateTimer } from '../simulation/performanceTimer';
import { createInitialState, step } from '../simulation/simulator';
import type { SimConfig } from '../simulation/types';
import { mpsToKmh, powerFromTorque } from '../units';
import { autoRide, prepareLaunch } from './autoRider';
import type { ChassisPoint, ChassisRunResult, DynoPoint, DynoResult } from './types';

/** 50 rpm so published peaks such as 5,250 or 7,250 rpm land on a sample. */
export const DYNO_RPM_STEP = 50;
export const DYNO_START_RPM = 2000;
/** Chassis run stops when acceleration stays below this for TOP_SPEED_HOLD_S. */
export const TOP_SPEED_ACCEL_MPS2 = 0.03;
export const TOP_SPEED_HOLD_S = 1.5;
export const CHASSIS_MAX_TIME_S = 90;
export const CHASSIS_SPEED_STEP_KMH = 1;

/** Steady-state WOT sweep of the crank, from DYNO_START_RPM to the (tuned) rev limit. */
export function engineSweep(config: SimConfig | SimModel): DynoResult {
  const model = 'engine' in config ? config : buildModel(config);
  const { engine } = model;
  const points: DynoPoint[] = [];

  for (let rpm = DYNO_START_RPM; rpm <= engine.revLimitRpm; rpm += DYNO_RPM_STEP) {
    const torqueNm = tunedWotTorqueNm(engine, rpm);
    points.push({ rpm, torqueNm, powerW: powerFromTorque(torqueNm, rpm) });
  }
  const first = points[0] ?? { rpm: 0, torqueNm: 0, powerW: 0 };
  return {
    points,
    peakPower: points.reduce((a, b) => (b.powerW > a.powerW ? b : a), first),
    peakTorque: points.reduce((a, b) => (b.torqueNm > a.torqueNm ? b : a), first),
  };
}

/**
 * Full-throttle run from standstill to top speed through the whole drivetrain
 * (clutch, variator or gearbox, final drive, drag), ridden by {@link autoRide}.
 * Samples wheel power every km/h.
 */
export function chassisRun(config: SimConfig | SimModel): ChassisRunResult {
  const model = 'engine' in config ? config : buildModel(config);
  let sim = prepareLaunch(model, createInitialState(model));
  let timer = armTimer();
  const points: ChassisPoint[] = [];
  let nextMarkKmh = CHASSIS_SPEED_STEP_KMH;
  let flatSinceS: number | null = null;
  let peakWheelPowerW = 0;

  while (sim.timeS < CHASSIS_MAX_TIME_S) {
    const { input, shift } = autoRide(model, sim);
    if (shift) sim = shiftGear(model, sim, shift);
    sim = step(model, sim, input);
    timer = updateTimer(timer, sim);
    // Right after an upshift the clutch dumps flywheel energy into the wheel
    // for a few ms. A real dyno averages that out; report sustained power only.
    const wheelPowerW = Math.min(
      sim.wheelPowerW,
      Math.max(0, sim.enginePowerW) * DRIVETRAIN_EFFICIENCY,
    );
    peakWheelPowerW = Math.max(peakWheelPowerW, wheelPowerW);

    const speedKmh = mpsToKmh(sim.speedMps);
    if (speedKmh >= nextMarkKmh) {
      points.push({
        speedKmh: nextMarkKmh,
        wheelPowerW,
        engineRpm: sim.engineRpm,
        gearRatio: sim.gearRatio,
        gear: sim.gear,
      });
      nextMarkKmh += CHASSIS_SPEED_STEP_KMH;
    }

    if (sim.accelerationMps2 < TOP_SPEED_ACCEL_MPS2 && sim.speedMps > 1) {
      flatSinceS ??= sim.timeS;
      if (sim.timeS - flatSinceS >= TOP_SPEED_HOLD_S) break;
    } else {
      flatSinceS = null;
    }
  }

  return {
    points,
    times: { ...timer.times, topSpeedKmh: mpsToKmh(sim.speedMps) },
    peakWheelPowerW,
  };
}

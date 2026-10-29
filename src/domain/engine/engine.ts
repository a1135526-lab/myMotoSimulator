import type { TorquePoint } from '../model/bike';
import type { TorqueGainCurve } from '../model/tune';
import { clamp } from '../units';
import { tuneGainAt } from './ecu';
import { wotTorqueAt } from './torqueCurve';

/**
 * Pumping + friction loss with the throttle shut, N·m per 1000 rpm.
 * Gives realistic engine braking (≈4–5 N·m at 8000 rpm on a 150 cc single).
 */
export const FRICTION_NM_PER_KRPM = 0.55;
/** Idle-air control: extra torque per rpm below idle. */
export const IDLE_GOVERNOR_NM_PER_RPM = 0.01;
export const IDLE_GOVERNOR_MAX_NM = 6;

const RPM_PER_KRPM = 1000;

export interface EngineModel {
  readonly torqueCurve: readonly TorquePoint[];
  readonly ecuGain: TorqueGainCurve;
  readonly intakeExhaustGain: TorqueGainCurve;
  readonly idleRpm: number;
  readonly revLimitRpm: number;
  readonly inertiaKgM2: number;
}

/** WOT torque after ECU and intake/exhaust corrections. */
export const tunedWotTorqueNm = (engine: EngineModel, rpm: number): number =>
  wotTorqueAt(engine.torqueCurve, rpm) * tuneGainAt(engine.ecuGain, engine.intakeExhaustGain, rpm);

const frictionTorqueNm = (rpm: number): number => (FRICTION_NM_PER_KRPM * rpm) / RPM_PER_KRPM;

/**
 * Net crank torque:
 *   T = T_wot(rpm) × throttle × gains        (0 while fuel is cut)
 *     − T_friction(rpm) × (1 − throttle)     (engine braking)
 *     + T_idle                                (idle governor, ≥ 0)
 *
 * The idle governor holds idle by adding torque below idle rpm; above idle it
 * contributes nothing.
 */
export function engineTorqueNm(
  engine: EngineModel,
  rpm: number,
  throttle: number,
  fuelCut: boolean,
): number {
  const t = clamp(throttle, 0, 1);
  const combustion = fuelCut ? 0 : tunedWotTorqueNm(engine, rpm) * t;
  const friction = frictionTorqueNm(rpm) * (fuelCut ? 1 : 1 - t);
  const idleAssist = clamp(
    IDLE_GOVERNOR_NM_PER_RPM * (engine.idleRpm - rpm) + frictionTorqueNm(engine.idleRpm),
    0,
    IDLE_GOVERNOR_MAX_NM,
  );
  return combustion - friction + (fuelCut ? 0 : idleAssist);
}

import type { TorqueGainCurve } from '../model/tune';
import { gainAt } from './torqueCurve';

/** Fuel resumes this far below the limit, so the limiter "bounces" like a real ECU. */
export const REV_LIMIT_HYSTERESIS_RPM = 200;

/**
 * Fuel-cut state with hysteresis.
 * Cuts when rpm ≥ limit; resumes only once rpm drops below limit − hysteresis.
 */
export function isFuelCut(rpm: number, revLimitRpm: number, wasCut: boolean): boolean {
  if (rpm >= revLimitRpm) return true;
  if (wasCut) return rpm > revLimitRpm - REV_LIMIT_HYSTERESIS_RPM;
  return false;
}

/** Combined torque multiplier from ECU map and intake/exhaust mods. */
export const tuneGainAt = (
  ecuGain: TorqueGainCurve,
  intakeExhaustGain: TorqueGainCurve,
  rpm: number,
): number => gainAt(ecuGain, rpm) * gainAt(intakeExhaustGain, rpm);

import { psToWatts, rpmToRadPerSec, type TorquePoint } from '@/domain';

/**
 * Builds a plausible WOT torque curve from the two published numbers every
 * spec sheet has — peak torque @ rpm and peak power @ rpm — for bikes with no
 * dyno chart available. The result reproduces both peaks exactly; the shape
 * in between is an estimate and must be labelled as such in provenance.
 *
 *   start → torque peak   rises as a quarter sine from lowEndFraction × T_max
 *   torque → power peak   linear from T_max down to T_p = P_max / ω_p
 *   above power peak      T_p · (ω_p / ω)², so power falls off past the peak
 */
export interface CurveInputs {
  readonly peakTorque: { readonly nm: number; readonly rpm: number };
  readonly peakPower: { readonly ps: number; readonly rpm: number };
  readonly revLimitRpm: number;
  /** Torque at startRpm as a fraction of peak. Lower = peakier engine. */
  readonly lowEndFraction?: number;
  readonly startRpm?: number;
  readonly stepRpm?: number;
}

const DEFAULT_LOW_END = 0.55;
const DEFAULT_START_RPM = 1500;
const DEFAULT_STEP_RPM = 500;
const FALL_OFF_EXPONENT = 2;
const DECIMALS = 1000;

export function synthesizeTorqueCurve(c: CurveInputs): TorquePoint[] {
  const start = c.startRpm ?? DEFAULT_START_RPM;
  const step = c.stepRpm ?? DEFAULT_STEP_RPM;
  const f0 = c.lowEndFraction ?? DEFAULT_LOW_END;
  const tMax = c.peakTorque.nm;
  const rT = c.peakTorque.rpm;
  const rP = c.peakPower.rpm;
  const tP = Math.min(tMax, psToWatts(c.peakPower.ps) / rpmToRadPerSec(rP));

  const torqueAt = (rpm: number): number => {
    if (rpm <= rT) {
      const t = (rpm - start) / (rT - start);
      return tMax * (f0 + (1 - f0) * Math.sin((Math.PI / 2) * t));
    }
    if (rpm <= rP) return tMax + ((tP - tMax) * (rpm - rT)) / (rP - rT);
    return tP * Math.pow(rP / rpm, FALL_OFF_EXPONENT);
  };

  const end = Math.ceil(c.revLimitRpm / step) * step;
  const rpms = new Set<number>([rT, rP]);
  for (let rpm = start; rpm <= end; rpm += step) rpms.add(rpm);

  return [...rpms]
    .sort((a, b) => a - b)
    .map((rpm) => ({ rpm, torqueNm: Math.round(torqueAt(rpm) * DECIMALS) / DECIMALS }));
}

import type { TorquePoint } from '../model/bike';
import type { TorqueGainCurve } from '../model/tune';

interface RpmSample {
  readonly rpm: number;
}

/**
 * Piecewise-linear interpolation over points sorted by ascending rpm.
 * Outside the sampled range the nearest end value is held (no extrapolation).
 */
function interpolate<T extends RpmSample>(
  points: readonly T[],
  rpm: number,
  valueOf: (point: T) => number,
  emptyValue: number,
): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return emptyValue;
  if (rpm <= first.rpm) return valueOf(first);
  if (rpm >= last.rpm) return valueOf(last);

  for (let i = 1; i < points.length; i++) {
    const hi = points[i];
    const lo = points[i - 1];
    if (hi && lo && rpm <= hi.rpm) {
      const t = (rpm - lo.rpm) / (hi.rpm - lo.rpm);
      return valueOf(lo) + t * (valueOf(hi) - valueOf(lo));
    }
  }
  return valueOf(last);
}

/** Wide-open-throttle crank torque (N·m) at the given rpm. */
export const wotTorqueAt = (curve: readonly TorquePoint[], rpm: number): number =>
  interpolate(curve, rpm, (p) => p.torqueNm, 0);

/** Multiplicative gain at the given rpm; an empty curve is the stock gain of 1. */
export const gainAt = (curve: TorqueGainCurve, rpm: number): number =>
  interpolate(curve, rpm, (p) => p.gain, 1);

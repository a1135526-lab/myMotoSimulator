import type { TireSpec } from '../model/bike';
import { inchToMm, mmToM } from '../units';

/** Loaded rolling radius is a few % below the unloaded radius. */
export const ROLLING_RADIUS_FACTOR = 0.97;
const ASPECT_PERCENT = 100;

/** Unloaded radius from an ISO size like 130/70-13. */
export function tireRadiusM(tire: TireSpec): number {
  const sidewallMm = (tire.widthMm * tire.aspectRatio) / ASPECT_PERCENT;
  return mmToM(inchToMm(tire.rimDiameterInch) / 2 + sidewallMm);
}

export const rollingRadiusM = (tire: TireSpec): number => tireRadiusM(tire) * ROLLING_RADIUS_FACTOR;

/** Circumference actually travelled per wheel revolution, m. */
export const rollingCircumferenceM = (tire: TireSpec): number => 2 * Math.PI * rollingRadiusM(tire);

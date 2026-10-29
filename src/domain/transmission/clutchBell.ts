import { mmToM } from '../units';

/**
 * Clutch bell (碗公) modelled as a thin ring with a web:
 *   I ≈ k · m · r²   with k < 1 to account for mass in the web/hub.
 */
export const BELL_INERTIA_SHAPE_FACTOR = 0.8;

export function bellInertiaKgM2(diameterMm: number, massKg: number): number {
  const r = mmToM(diameterMm) / 2;
  return BELL_INERTIA_SHAPE_FACTOR * massKg * r * r;
}

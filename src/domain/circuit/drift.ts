import { clamp, STANDARD_GRAVITY } from '../units';

/**
 * Brake drift (backing it in): braking hard while steering lets the rear step
 * out. The slide turns the bike harder than lean alone allows — extra lateral
 * force from the rear tyre sliding sideways — and the locked-up rear brakes
 * freely, so speed bleeds off fast. A game-feel aid rather than tyre physics.
 *
 * drift is signed: + = sliding into a left turn, −1…1 = how far into the slide.
 */

/** Extra cornering the slide adds at full drift, in g. */
export const DRIFT_EXTRA_G = 0.55;
/** Slip angle of the bike body at full drift (visual), rad. */
export const DRIFT_SLIP_RAD = 0.45;
/** Below this the bike just stops instead of sliding. */
export const DRIFT_MIN_SPEED_MPS = 8;
/** Inputs that start a drift: shaped brake and steer at least this much. */
export const DRIFT_BRAKE_MIN = 0.5;
export const DRIFT_STEER_MIN = 0.4;
const DRIFT_IN_PER_S = 3.5;
const DRIFT_OUT_PER_S = 2.5;

export const wantsDrift = (brake: number, steer: number): boolean =>
  brake >= DRIFT_BRAKE_MIN && Math.abs(steer) >= DRIFT_STEER_MIN;

/** Ease toward full slide in the steered direction, or back to grip. */
export function stepDrift(
  drift: number,
  wanted: boolean,
  steer: number,
  speedMps: number,
  dtS: number,
): number {
  const target = wanted && speedMps >= DRIFT_MIN_SPEED_MPS ? Math.sign(steer) : 0;
  // Changing sides goes through zero first, at the slower recovery rate.
  const rate =
    Math.abs(target) > Math.abs(drift) && target * drift >= 0 ? DRIFT_IN_PER_S : DRIFT_OUT_PER_S;
  return clamp(drift + clamp(target - drift, -rate * dtS, rate * dtS), -1, 1);
}

/** Extra path curvature (+ = left) the slide adds at this speed. */
export function driftCurvature(drift: number, speedMps: number): number {
  const v = Math.max(speedMps, DRIFT_MIN_SPEED_MPS);
  return (drift * DRIFT_EXTRA_G * STANDARD_GRAVITY) / (v * v);
}

import { clamp, STANDARD_GRAVITY } from '../units';

/**
 * Brake drift (backing it in): braking hard while steering lets the rear step
 * out. The slide turns the bike harder than lean alone allows — extra lateral
 * force from the rear tyre sliding sideways. Once sliding, the rider can hold
 * it for as long as they stay on the brake; only the rear is braking then, so
 * speed bleeds off slowly and a little throttle keeps the slide going.
 * A game-feel aid rather than tyre physics.
 *
 * drift is signed: + = sliding into a left turn, −1…1 = how far into the slide.
 */

/** Extra cornering the slide adds at full drift, in g. */
export const DRIFT_EXTRA_G = 0.55;
/** Slip angle of the bike body at full drift (visual), rad. */
export const DRIFT_SLIP_RAD = 0.45;
/** Below this the bike just stops instead of sliding. */
export const DRIFT_MIN_SPEED_MPS = 5;
/** Shaped brake that starts and holds a slide; steer needed to start one. */
export const DRIFT_BRAKE_MIN = 0.5;
export const DRIFT_STEER_MIN = 0.4;
/** Braking left while fully sideways (rear wheel only), share of grip. */
export const DRIFT_BRAKE_SHARE = 0.35;
/** Turning a held slide gives with the steer centred (share of the full slide's). */
const HELD_TURN_SHARE = 0.35;
const DRIFT_IN_PER_S = 3.5;
const DRIFT_OUT_PER_S = 2.5;

/** The brake is on hard enough to start or hold a slide. */
export const wantsDrift = (brake: number): boolean => brake >= DRIFT_BRAKE_MIN;

/**
 * Ease toward full slide or back to grip. Steering past DRIFT_STEER_MIN picks
 * the side; with the steer centred a slide already going is held while
 * braking; steering the other way (counter-steer) swings it across.
 */
export function stepDrift(
  drift: number,
  braking: boolean,
  steer: number,
  speedMps: number,
  dtS: number,
): number {
  const steered = Math.abs(steer) >= DRIFT_STEER_MIN ? Math.sign(steer) : 0;
  const side = steered !== 0 ? steered : Math.sign(drift);
  const target = braking && speedMps >= DRIFT_MIN_SPEED_MPS ? side : 0;
  // Changing sides goes through zero first, at the slower recovery rate.
  const rate =
    Math.abs(target) > Math.abs(drift) && target * drift >= 0 ? DRIFT_IN_PER_S : DRIFT_OUT_PER_S;
  return clamp(drift + clamp(target - drift, -rate * dtS, rate * dtS), -1, 1);
}

/** Extra path curvature (+ = left) the slide adds at this speed and steer. */
export function driftCurvature(drift: number, speedMps: number, steer = Math.sign(drift)): number {
  const v = Math.max(speedMps, DRIFT_MIN_SPEED_MPS);
  const along = steer * Math.sign(drift);
  // Counter-steering straightens the slide instead of tightening it.
  const turn =
    along > 0
      ? Math.max(HELD_TURN_SHARE, Math.min(1, Math.abs(steer)))
      : along < 0
        ? 0
        : HELD_TURN_SHARE;
  return (drift * turn * DRIFT_EXTRA_G * STANDARD_GRAVITY) / (v * v);
}

/** Share of grip the brake can use: full grip upright, the rear alone when sideways. */
export const driftBrakeShare = (drift: number, gripShare: number): number =>
  gripShare + (DRIFT_BRAKE_SHARE - gripShare) * Math.abs(drift);

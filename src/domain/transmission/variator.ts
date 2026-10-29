import { clamp } from '../units';

/**
 * Drive-pulley (普利盤) model.
 *
 * Force balance on the movable drive face:
 *   roller centrifugal force  F_r = Σm · ω² · r      (pushes toward high ratio)
 *   torque spring + cam force F_s                     (pushes toward low ratio)
 * The variator moves when F_r > F_s, so the engine speed it "holds" during the
 * shift satisfies ω² ∝ F_s / Σm, i.e.
 *
 *   holdRpm = stockShiftRpm · √( springFactor · Σm_stock / Σm )
 *
 * Lighter rollers or a stiffer spring raise the hold rpm. The torque cam on
 * the driven pulley adds force proportional to transmitted torque, which is
 * why part throttle shifts earlier; that share is TORQUE_CAM_SHARE.
 *
 * As the rollers climb the ramp the spring compresses further, so the hold
 * rpm rises across the shift. That rise is set per bike from the observed
 * WOT rpm at shift start and at the end of the shift (top ratio reached):
 *
 *   shiftRise = stockShiftEndRpm / stockShiftRpm − 1
 *
 * Simplifications (documented in docs/PHYSICS.md):
 *   - The rise is linear in face position (ramp profile not modelled in detail).
 *   - The variator follows its equilibrium with a first-order lag.
 */

/** Fraction of the anti-shift force that comes from the load-dependent torque cam. */
export const TORQUE_CAM_SHARE = 0.45;
/** Lag of the movable face toward equilibrium, s. */
export const VARIATOR_TIME_CONSTANT_S = 0.12;

export interface VariatorModel {
  readonly lowRatio: number;
  readonly highRatio: number;
  /** Hold rpm at wide-open throttle with this tune, at shift start. */
  readonly fullLoadShiftRpm: number;
  /** Fractional hold-rpm increase from shift start to top ratio (> 0). */
  readonly shiftRise: number;
}

export interface ShiftRpmInputs {
  readonly stockShiftRpm: number;
  readonly stockRollerTotalG: number;
  readonly rollerTotalG: number;
  readonly torqueSpringFactor: number;
}

export function fullLoadShiftRpm(i: ShiftRpmInputs): number {
  return i.stockShiftRpm * Math.sqrt((i.torqueSpringFactor * i.stockRollerTotalG) / i.rollerTotalG);
}

/** Engine rpm the variator holds at the given throttle (0..1), at shift start. */
export function holdRpm(v: VariatorModel, throttle: number): number {
  const load = 1 - TORQUE_CAM_SHARE * (1 - clamp(throttle, 0, 1));
  return v.fullLoadShiftRpm * Math.sqrt(load);
}

/** Equilibrium face position: 0 = full low ratio, 1 = full high ratio. */
export function equilibriumPosition(v: VariatorModel, engineRpm: number, throttle: number): number {
  return clamp((engineRpm / holdRpm(v, throttle) - 1) / v.shiftRise, 0, 1);
}

/** First-order lag toward the target position. */
export function stepPosition(position: number, target: number, dtS: number): number {
  const alpha = 1 - Math.exp(-dtS / VARIATOR_TIME_CONSTANT_S);
  return position + (target - position) * alpha;
}

/** Ratio at a face position, interpolated geometrically (constant % change per unit travel). */
export function ratioAt(v: VariatorModel, position: number): number {
  const x = clamp(position, 0, 1);
  return v.lowRatio * Math.pow(v.highRatio / v.lowRatio, x);
}

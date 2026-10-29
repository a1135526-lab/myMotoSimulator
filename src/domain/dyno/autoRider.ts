import { tunedWotTorqueNm } from '../engine/engine';
import type { ManualDrivetrain, SimModel } from '../simulation/model';
import type { SimInput, SimState } from '../simulation/types';

/**
 * Scripted rider for full-throttle dyno / drag runs.
 *
 * Scooter: just wide-open throttle.
 * Manual:  hold the clutch in and rev to launchRpm, feed the clutch out over
 *          LAUNCH_RELEASE_S, then upshift at the optimal point — when the next
 *          gear would put at least as much force on the rear wheel as the
 *          current one (or just before the limiter).
 */
export const LAUNCH_RELEASE_S = 0.8;
/** Shift this far below the limiter at the latest. */
export const LIMITER_SHIFT_MARGIN_RPM = 150;

export interface RiderDecision {
  readonly input: SimInput;
  readonly shift: 1 | 0;
}

const WOT: SimInput = { throttle: 1, brake: 0, clutchLever: 0 };

function wotTorqueBelowLimit(model: SimModel, rpm: number): number {
  return rpm >= model.engine.revLimitRpm ? 0 : tunedWotTorqueNm(model.engine, rpm);
}

/** Would the next gear push harder right now? */
export function shouldUpshift(model: SimModel, d: ManualDrivetrain, gear: number, rpm: number) {
  const current = d.gearRatios[gear - 1];
  const next = d.gearRatios[gear];
  if (current === undefined || next === undefined) return false;
  if (rpm >= model.engine.revLimitRpm - LIMITER_SHIFT_MARGIN_RPM) return true;
  const rpmAfter = (rpm * next) / current;
  return wotTorqueBelowLimit(model, rpmAfter) * next >= wotTorqueBelowLimit(model, rpm) * current;
}

/** Initial state for a scripted run: manual bikes start in 1st with the clutch pulled in. */
export function prepareLaunch(model: SimModel, state: SimState): SimState {
  return model.drivetrain.kind === 'manual' ? { ...state, gear: 1, clutchLever: 1 } : state;
}

export function autoRide(model: SimModel, sim: SimState): RiderDecision {
  const d = model.drivetrain;
  if (d.kind === 'scooter') return { input: WOT, shift: 0 };

  const holding = sim.clutchLever >= 1 && sim.engineRpm < d.launchRpm;
  const clutchLever = holding
    ? 1
    : Math.max(0, sim.clutchLever - model.timestepS / LAUNCH_RELEASE_S);
  const input: SimInput = { throttle: 1, brake: 0, clutchLever };

  const gear = sim.gear ?? 0;
  const canShift = clutchLever === 0 && sim.clutchState === 'locked' && gear > 0;
  const shift = canShift && shouldUpshift(model, d, gear, sim.engineRpm) ? 1 : 0;
  return { input, shift };
}

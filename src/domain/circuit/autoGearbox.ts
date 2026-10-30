import { shouldUpshift } from '../dyno/autoRider';
import type { SimModel } from '../simulation/model';
import type { SimState } from '../simulation/types';

/**
 * Automatic gearbox + anti-stall clutch for manual bikes on a circuit, so a
 * keyboard rider only has to steer, throttle and brake.
 *
 *  - Pulling away (slow, in 1st): the clutch slips until the engine is
 *    near its launch rpm, like a careful rider feeding it out.
 *  - Upshift when the next gear pulls harder (same rule as the dyno rider).
 *  - Downshift when slowing, as long as the lower gear won't over-rev.
 */
const LAUNCH_SPEED_MPS = 4;
const STALL_GUARD = 1.5;
const DOWNSHIFT_RPM_SHARE = 0.5;
const DOWNSHIFT_HEADROOM_RPM = 800;
const BRAKE_HOLD = 0.5;
const STANDSTILL_MPS = 0.5;

export interface GearboxDecision {
  readonly clutchLever: number;
  readonly shift: -1 | 0 | 1;
}

export function autoGearbox(
  model: SimModel,
  sim: SimState,
  throttle: number,
  brake = 0,
): GearboxDecision {
  const d = model.drivetrain;
  if (d.kind !== 'manual') return { clutchLever: 0, shift: 0 };
  const gear = sim.gear ?? 0;
  if (gear === 0) return { clutchLever: 1, shift: 1 };

  const idle = model.engine.idleRpm;
  const rpm = sim.engineRpm;

  if (gear === 1 && sim.speedMps < LAUNCH_SPEED_MPS) {
    // Holding the bike on the brake: clutch out so the engine revs freely.
    if (brake >= BRAKE_HOLD && sim.speedMps < STANDSTILL_MPS) return { clutchLever: 1, shift: 0 };
    const bite = idle * STALL_GUARD;
    const lever =
      rpm <= bite ? 1 : Math.max(0, Math.min(1, 1 - (rpm - bite) / (d.launchRpm - bite)));
    return { clutchLever: throttle > 0.05 ? lever : 1, shift: 0 };
  }

  if (sim.clutchState === 'locked' && throttle > 0.5 && shouldUpshift(model, d, gear, rpm)) {
    return { clutchLever: 0, shift: 1 };
  }
  const current = d.gearRatios[gear - 1];
  const lower = d.gearRatios[gear - 2];
  if (current !== undefined && lower !== undefined) {
    const rpmAfter = (rpm * lower) / current;
    const limit = model.engine.revLimitRpm;
    if (rpm < limit * DOWNSHIFT_RPM_SHARE && rpmAfter < limit - DOWNSHIFT_HEADROOM_RPM) {
      return { clutchLever: 0, shift: -1 };
    }
  }
  // Never let the engine be dragged into a stall when stopping.
  return { clutchLever: rpm < idle * STALL_GUARD ? 1 : 0, shift: 0 };
}

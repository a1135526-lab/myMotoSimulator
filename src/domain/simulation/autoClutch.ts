import type { SimModel } from './model';
import type { SimInput, SimState } from './types';

/**
 * Automatic clutch for manual bikes (in the spirit of an electronic or
 * centrifugal launch clutch): the rider still picks gears, but never has to
 * feed the lever out or catch a stall.
 *
 *  - Stopped, or braking at a standstill: clutch out, so the engine idles or
 *    revs freely (hold brake + throttle to stage a launch).
 *  - Pulling away: slip the clutch, letting it bite harder as the engine climbs
 *    from just above idle to its launch rpm — the half-clutch a rider would do.
 *  - Once locked it stays in, and only lets go if the engine is dragged toward
 *    a stall. After a gear change it re-engages at once.
 *
 * The rider's own lever always wins when pulled further than the automatic one.
 */
const STALL_GUARD = 1.5;
const THROTTLE_ON = 0.05;
const BRAKE_HOLD = 0.5;
/** Below this the bike counts as standing still. */
const STANDSTILL_MPS = 0.5;
/** Coasting: let the clutch in once the gear alone spins the engine this far over the bite point. */
const COAST_ENGAGE_SHARE = 1.2;
/** Rolling (e.g. after a shift): engage fully once the gear spins the engine this share of launch rpm. */
const ROLLING_ENGAGE_SHARE = 0.7;

export function autoClutchLever(model: SimModel, sim: SimState, input: SimInput): number {
  const d = model.drivetrain;
  if (d.kind !== 'manual' || (sim.gear ?? 0) === 0) return 0;
  const bite = model.engine.idleRpm * STALL_GUARD;
  const rpm = sim.engineRpm;

  if (sim.speedMps < STANDSTILL_MPS && input.brake >= BRAKE_HOLD) return 1;
  if (sim.clutchState === 'locked') return rpm < bite ? 1 : 0;
  if (sim.drivenRpm >= d.launchRpm * ROLLING_ENGAGE_SHARE) return 0;
  if (input.throttle <= THROTTLE_ON) return sim.drivenRpm >= bite * COAST_ENGAGE_SHARE ? 0 : 1;
  if (rpm <= bite) return 1;
  return Math.max(0, 1 - (rpm - bite) / (d.launchRpm - bite));
}

export function withAutoClutch(model: SimModel, sim: SimState, input: SimInput): SimInput {
  const auto = autoClutchLever(model, sim, input);
  return auto > input.clutchLever ? { ...input, clutchLever: auto } : input;
}

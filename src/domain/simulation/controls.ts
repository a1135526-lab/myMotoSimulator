import { LEVER_FULL_DISENGAGE } from './coupling';
import type { SimModel } from './model';
import type { SimState } from './types';

/**
 * Discrete rider actions on a manual bike. They happen between physics steps
 * (a key press), so they're pure state transitions rather than step inputs.
 */

/**
 * Sequential shift: N ↔ 1 ↔ 2 … ↔ top. (Real bikes put N between 1 and 2;
 * on a keyboard a linear pattern is far easier to use.)
 *
 * Shifting with the clutch released behaves like a clutchless shift: the
 * clutch is put into slip so engine speed is pulled to the new gear through
 * friction instead of snapping instantly.
 */
export function shiftGear(model: SimModel, state: SimState, direction: 1 | -1): SimState {
  const d = model.drivetrain;
  if (d.kind !== 'manual' || state.gear === null) return state;
  const gear = Math.min(Math.max(state.gear + direction, 0), d.gearRatios.length);
  if (gear === state.gear) return state;
  return {
    ...state,
    gear,
    clutchState: state.clutchState === 'locked' ? 'slipping' : state.clutchState,
  };
}

/** Why the starter won't engage, or null if it can. */
export function startBlockedReason(state: SimState): 'running' | 'in-gear' | null {
  if (state.engineRunning) return 'running';
  const inGear = state.gear !== null && state.gear > 0;
  if (inGear && state.clutchLever < LEVER_FULL_DISENGAGE) return 'in-gear';
  return null;
}

/** Starter button: works in neutral or with the clutch pulled in, like a real safety switch. */
export function startEngine(model: SimModel, state: SimState): SimState {
  if (startBlockedReason(state) !== null) return state;
  return {
    ...state,
    engineRunning: true,
    engineRpm: Math.max(state.engineRpm, model.engine.idleRpm),
    revLimiterActive: false,
  };
}

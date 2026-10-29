import { shapeInput } from './inputShaping';
import type { SimModel } from './model';
import { step } from './simulator';
import type { ControlCommand, SimInput, SimState } from './types';

/**
 * Fixed-timestep accumulator ("Fix Your Timestep"): rendering may run at any
 * frame rate, but physics always advances in exact `timestepS` increments.
 */

/** Cap on steps per call so a stalled tab doesn't freeze when it resumes. */
export const MAX_STEPS_PER_ADVANCE = 240;

export interface StepperState {
  readonly sim: SimState;
  readonly input: SimInput;
  readonly accumulatorS: number;
}

export interface AdvanceResult {
  readonly stepper: StepperState;
  /** Every intermediate state, oldest first (for timers that need each step). */
  readonly states: readonly SimState[];
}

export function advance(
  model: SimModel,
  stepper: StepperState,
  command: ControlCommand,
  elapsedS: number,
): AdvanceResult {
  const dt = model.timestepS;
  let accumulator = Math.min(
    stepper.accumulatorS + Math.max(0, elapsedS),
    dt * MAX_STEPS_PER_ADVANCE,
  );
  let { sim, input } = stepper;
  const states: SimState[] = [];

  while (accumulator >= dt) {
    input = shapeInput(input, command, dt);
    sim = step(model, sim, input);
    states.push(sim);
    accumulator -= dt;
  }
  return { stepper: { sim, input, accumulatorS: accumulator }, states };
}

import { shiftGear } from '../simulation/controls';
import { buildModel, type SimModel } from '../simulation/model';
import { createInitialState, step } from '../simulation/simulator';
import type { SimConfig } from '../simulation/types';
import { STAGE_BEAM_M } from '../race/racer';
import { mpsToKmh } from '../units';
import { autoRide, prepareLaunch } from './autoRider';

/** Give up if the bike can't cover the distance in this long (e.g. a steep hill). */
export const DRAG_RUN_TIMEOUT_S = 120;

export interface DragRunResult {
  /** Stage beam → finish, s. Null if the distance wasn't reached. */
  readonly etS: number | null;
  readonly trapSpeedKmh: number | null;
}

/**
 * Solo pass over a given distance with the scripted rider — the number shown
 * on the garage screens ("預估 ET") before you race. Uses the same timing
 * rules as a real race: ET starts when the bike breaks the stage beam.
 */
export function dragRun(config: SimConfig | SimModel, distanceM: number): DragRunResult {
  const model = 'engine' in config ? config : buildModel(config);
  let sim = prepareLaunch(model, createInitialState(model));
  let leftAtS: number | null = null;

  while (sim.timeS < DRAG_RUN_TIMEOUT_S) {
    const prev = sim;
    const { input, shift } = autoRide(model, sim);
    if (shift) sim = shiftGear(model, sim, shift);
    sim = step(model, sim, input);

    if (leftAtS === null && sim.distanceM >= STAGE_BEAM_M) leftAtS = sim.timeS;
    if (sim.distanceM >= distanceM) {
      // Interpolate the crossing inside the last step.
      const frac = (distanceM - prev.distanceM) / (sim.distanceM - prev.distanceM);
      const finishS = prev.timeS + frac * (sim.timeS - prev.timeS);
      return { etS: finishS - (leftAtS ?? 0), trapSpeedKmh: mpsToKmh(sim.speedMps) };
    }
  }
  return { etS: null, trapSpeedKmh: null };
}

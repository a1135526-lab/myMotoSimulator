import { clutchCapacityNm } from '../transmission/clutch';
import { equilibriumPosition, ratioAt, stepPosition } from '../transmission/variator';
import { clamp } from '../units';
import type { CvtDrivetrain, ManualDrivetrain, SimModel } from './model';
import type { SimInput, SimState } from './types';

/**
 * How the engine is connected to the rear wheel for one step, expressed on
 * the crank side so the solver doesn't care whether it's a CVT or a gearbox.
 */
export interface Coupling {
  /** Ratio shown to the rider (belt ratio or selected gear ratio; 0 in neutral). */
  readonly gearRatio: number;
  readonly variatorPosition: number;
  /** Engine rad/s per m/s of road speed when the clutch is locked (0 = neutral). */
  readonly engineRadSPerMps: number;
  /** Crank-side clutch torque capacity at the given engine speed, N·m. */
  readonly capacityAt: (engineRadS: number) => number;
}

/**
 * Manual clutch engagement vs lever travel. The friction zone sits between
 * 15 % and 85 % travel (free play at both ends), with a smoothstep in between
 * so the bite comes in progressively.
 */
export const LEVER_FREE_PLAY = 0.15;
export const LEVER_FULL_DISENGAGE = 0.85;

export function clutchEngagement(lever: number): number {
  const t = clamp((LEVER_FULL_DISENGAGE - lever) / (LEVER_FULL_DISENGAGE - LEVER_FREE_PLAY), 0, 1);
  return t * t * (3 - 2 * t);
}

function cvtCoupling(
  d: CvtDrivetrain,
  model: SimModel,
  prev: SimState,
  throttle: number,
): Coupling {
  const target = equilibriumPosition(d.variator, prev.engineRpm, throttle);
  const variatorPosition = stepPosition(prev.variatorPosition, target, model.timestepS);
  const ratio = ratioAt(d.variator, variatorPosition);
  return {
    gearRatio: ratio,
    variatorPosition,
    engineRadSPerMps: (ratio * d.finalDriveRatio) / model.body.wheelRadiusM,
    // Centrifugal clutch sits after the belt: shoes turn at ω_e / ratio, and
    // shoe torque reflects to the crank divided by the ratio.
    capacityAt: (engineRadS) => clutchCapacityNm(d.clutch, engineRadS / ratio) / ratio,
  };
}

function manualCoupling(
  d: ManualDrivetrain,
  model: SimModel,
  gear: number,
  lever: number,
): Coupling {
  const ratio = gear > 0 ? (d.gearRatios[gear - 1] ?? 0) : 0;
  if (ratio === 0) {
    return { gearRatio: 0, variatorPosition: 0, engineRadSPerMps: 0, capacityAt: () => 0 };
  }
  const capacity = d.clutchCapacityNm * clutchEngagement(lever);
  return {
    gearRatio: ratio,
    variatorPosition: 0,
    engineRadSPerMps: (ratio * d.fixedReduction) / model.body.wheelRadiusM,
    capacityAt: () => capacity,
  };
}

export function resolveCoupling(model: SimModel, prev: SimState, input: SimInput): Coupling {
  const d = model.drivetrain;
  return d.kind === 'scooter'
    ? cvtCoupling(d, model, prev, input.throttle)
    : manualCoupling(d, model, prev.gear ?? 0, input.clutchLever);
}

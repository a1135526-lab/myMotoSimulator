import type { BikeSpec } from '../model/bike';
import type { TuneSetup } from '../model/tune';

/** Default physics step: 240 Hz, independent of render frame rate. */
export const DEFAULT_TIMESTEP_S = 1 / 240;

export interface Environment {
  /** kg/m³ */
  readonly airDensity: number;
  /** Road grade, % (positive = uphill). */
  readonly gradePercent: number;
  /** Tyre grip limit for drive force, in g (dry ≈ 1.0, wet ≈ 0.6). */
  readonly tractionG: number;
}

export const DEFAULT_TRACTION_G = 1.0;

export interface SimConfig {
  readonly bike: BikeSpec;
  readonly tune: TuneSetup;
  readonly environment: Environment;
  readonly timestepS: number;
}

/**
 * Rider command for one physics step, already shaped (ramped) by
 * {@link shapeInput}. All values are 0..1.
 */
export interface SimInput {
  readonly throttle: number;
  readonly brake: number;
  /** Clutch lever travel: 0 = released (engaged), 1 = pulled in. Manual bikes only. */
  readonly clutchLever: number;
}

/** Raw digital controls (keyboard / touch buttons) before shaping. */
export interface ControlCommand {
  readonly throttlePressed: boolean;
  readonly brakePressed: boolean;
  readonly clutchPressed: boolean;
}

export type ClutchState = 'disengaged' | 'slipping' | 'locked';

/** Full simulator state after a step. All values SI unless the name says otherwise. */
export interface SimState {
  readonly timeS: number;
  readonly engineRpm: number;
  readonly engineRunning: boolean;
  /** Rear-wheel side of the clutch, expressed as equivalent engine rpm. */
  readonly drivenRpm: number;
  readonly speedMps: number;
  readonly distanceM: number;
  readonly accelerationMps2: number;
  /** CVT: current belt ratio. Manual: ratio of the selected gear (0 in neutral). */
  readonly gearRatio: number;
  /** Manual: 0 = neutral, 1…n = gear. Scooter: null. */
  readonly gear: number | null;
  /** Movable drive face: 0 = low ratio, 1 = high ratio. Always 0 on manual bikes. */
  readonly variatorPosition: number;
  readonly clutchState: ClutchState;
  readonly throttle: number;
  readonly brake: number;
  readonly clutchLever: number;
  readonly engineTorqueNm: number;
  readonly enginePowerW: number;
  /** Power actually delivered at the rear wheel after clutch slip and losses. */
  readonly wheelPowerW: number;
  readonly revLimiterActive: boolean;
}

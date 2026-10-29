import type { RunTimes } from '../simulation/performanceTimer';

/** Engine dyno sample (crank, wide-open throttle, steady state). */
export interface DynoPoint {
  readonly rpm: number;
  readonly torqueNm: number;
  readonly powerW: number;
}

export interface DynoResult {
  readonly points: readonly DynoPoint[];
  readonly peakPower: DynoPoint;
  readonly peakTorque: DynoPoint;
}

/**
 * Chassis dyno sample, plotted against road speed — the way Taiwanese scooter
 * dyno sheets are usually drawn, since a CVT has no fixed rpm↔speed relation.
 */
export interface ChassisPoint {
  readonly speedKmh: number;
  readonly wheelPowerW: number;
  readonly engineRpm: number;
  readonly gearRatio: number;
  readonly gear: number | null;
}

export interface ChassisRunResult {
  readonly points: readonly ChassisPoint[];
  readonly times: RunTimes;
  readonly peakWheelPowerW: number;
}

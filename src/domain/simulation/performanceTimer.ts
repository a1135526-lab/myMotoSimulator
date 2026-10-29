import { mpsToKmh } from '../units';
import type { SimState } from './types';

/**
 * Drag-strip style timer: arm it, then it starts on launch and records
 * 0–60 / 0–100 km/h and 0–100 / 0–400 m. Crossing times are interpolated
 * between physics steps, so results don't depend on the timestep phase.
 */

export const LAUNCH_SPEED_KMH = 0.5;
export const RUN_TIMEOUT_S = 60;
const SPEED_MARKS_KMH = { zeroTo60S: 60, zeroTo100S: 100 } as const;
const DISTANCE_MARKS_M = { zeroTo100mS: 100, zeroTo400mS: 400 } as const;

export interface RunTimes {
  readonly zeroTo60S?: number;
  readonly zeroTo100S?: number;
  readonly zeroTo100mS?: number;
  readonly zeroTo400mS?: number;
  readonly topSpeedKmh: number;
}

export type TimerPhase = 'idle' | 'armed' | 'running' | 'finished';

export interface TimerState {
  readonly phase: TimerPhase;
  readonly startTimeS: number;
  readonly startDistanceM: number;
  readonly elapsedS: number;
  readonly times: RunTimes;
  /** Previous sample, for crossing interpolation. */
  readonly last?: { readonly timeS: number; readonly speedKmh: number; readonly distanceM: number };
}

export const IDLE_TIMER: TimerState = {
  phase: 'idle',
  startTimeS: 0,
  startDistanceM: 0,
  elapsedS: 0,
  times: { topSpeedKmh: 0 },
};

export const armTimer = (): TimerState => ({ ...IDLE_TIMER, phase: 'armed' });

/** Space bar: idle/finished → armed, armed/running → idle. */
export const toggleTimer = (timer: TimerState): TimerState =>
  timer.phase === 'idle' || timer.phase === 'finished' ? armTimer() : IDLE_TIMER;

const crossing = (t0: number, v0: number, t1: number, v1: number, mark: number): number =>
  v1 === v0 ? t1 : t0 + ((mark - v0) / (v1 - v0)) * (t1 - t0);

export function updateTimer(timer: TimerState, sim: SimState): TimerState {
  const speedKmh = mpsToKmh(sim.speedMps);
  const sample = { timeS: sim.timeS, speedKmh, distanceM: sim.distanceM };

  if (timer.phase === 'armed') {
    // The run starts at the last sample where the bike was truly stationary.
    if (speedKmh < LAUNCH_SPEED_KMH) {
      return { ...timer, last: speedKmh === 0 || !timer.last ? sample : timer.last };
    }
    const start = timer.last ?? sample;
    return updateTimer(
      { ...timer, phase: 'running', startTimeS: start.timeS, startDistanceM: start.distanceM },
      sim,
    );
  }
  if (timer.phase !== 'running') return timer;

  const last = timer.last ?? sample;
  const times: { -readonly [K in keyof RunTimes]: RunTimes[K] } = { ...timer.times };
  const rel = (t: number) => t - timer.startTimeS;

  for (const [key, mark] of Object.entries(SPEED_MARKS_KMH) as [
    keyof typeof SPEED_MARKS_KMH,
    number,
  ][]) {
    if (times[key] === undefined && speedKmh >= mark) {
      times[key] = rel(crossing(last.timeS, last.speedKmh, sim.timeS, speedKmh, mark));
    }
  }
  const d0 = last.distanceM - timer.startDistanceM;
  const d1 = sim.distanceM - timer.startDistanceM;
  for (const [key, mark] of Object.entries(DISTANCE_MARKS_M) as [
    keyof typeof DISTANCE_MARKS_M,
    number,
  ][]) {
    if (times[key] === undefined && d1 >= mark) {
      times[key] = rel(crossing(last.timeS, d0, sim.timeS, d1, mark));
    }
  }
  times.topSpeedKmh = Math.max(times.topSpeedKmh, speedKmh);

  const elapsedS = rel(sim.timeS);
  const done =
    (times.zeroTo400mS !== undefined && times.zeroTo100S !== undefined) ||
    elapsedS >= RUN_TIMEOUT_S ||
    sim.brake > 0.5;
  return { ...timer, phase: done ? 'finished' : 'running', elapsedS, times, last: sample };
}

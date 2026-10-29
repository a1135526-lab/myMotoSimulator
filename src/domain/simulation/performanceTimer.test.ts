import { describe, expect, it } from 'vitest';
import { kmhToMps } from '../units';
import {
  armTimer,
  IDLE_TIMER,
  RUN_TIMEOUT_S,
  toggleTimer,
  updateTimer,
  type TimerState,
} from './performanceTimer';
import type { SimState } from './types';

const sim = (timeS: number, speedKmh: number, distanceM: number, brake = 0): SimState => ({
  timeS,
  engineRpm: 0,
  engineRunning: true,
  drivenRpm: 0,
  speedMps: kmhToMps(speedKmh),
  distanceM,
  accelerationMps2: 0,
  gearRatio: 1,
  gear: null,
  variatorPosition: 0,
  clutchState: 'locked',
  throttle: 1,
  brake,
  clutchLever: 0,
  engineTorqueNm: 0,
  enginePowerW: 0,
  wheelPowerW: 0,
  revLimiterActive: false,
});

/** Constant 2 m/s² from t=1 s. */
function feed(timer: TimerState, untilS: number, dt = 0.05): TimerState {
  let t = timer;
  for (let i = 0; i * dt <= untilS; i++) {
    const time = i * dt;
    const run = i * dt > 1 ? time - 1 : 0;
    t = updateTimer(t, sim(time, run * 2 * 3.6, run * run));
  }
  return t;
}

describe('performanceTimer', () => {
  it('does nothing while idle', () => {
    expect(updateTimer(IDLE_TIMER, sim(1, 50, 10))).toBe(IDLE_TIMER);
  });

  it('toggles idle ↔ armed', () => {
    expect(toggleTimer(IDLE_TIMER).phase).toBe('armed');
    expect(toggleTimer(armTimer()).phase).toBe('idle');
  });

  it('waits for launch when armed', () => {
    const t = updateTimer(armTimer(), sim(0, 0, 0));
    expect(t.phase).toBe('armed');
  });

  it('records interpolated split times from launch', () => {
    const t = feed(armTimer(), 25);
    // v = 2t → 60 km/h (16.67 m/s) at 8.33 s; d = t² → 100 m at 10 s, 400 m at 20 s.
    expect(t.times.zeroTo60S).toBeCloseTo(60 / 3.6 / 2, 1);
    expect(t.times.zeroTo100mS).toBeCloseTo(10, 1);
    expect(t.times.zeroTo400mS).toBeCloseTo(20, 1);
    expect(t.times.zeroTo100S).toBeCloseTo(100 / 3.6 / 2, 1);
    expect(t.phase).toBe('finished');
  });

  it('finishes on brake', () => {
    const running = feed(armTimer(), 3);
    expect(running.phase).toBe('running');
    expect(updateTimer(running, sim(3.1, 10, 5, 1)).phase).toBe('finished');
  });

  it('times out', () => {
    const running = feed(armTimer(), 3);
    expect(updateTimer(running, sim(RUN_TIMEOUT_S + 5, 50, 300)).phase).toBe('finished');
  });
});

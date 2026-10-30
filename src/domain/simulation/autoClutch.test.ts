import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { autoClutchLever, withAutoClutch } from './autoClutch';
import { shiftGear, startEngine } from './controls';
import { buildModel } from './model';
import { createInitialState, step } from './simulator';
import type { SimInput, SimState } from './types';

const model = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));
const scooter = buildModel(makeConfig());

const ride = (sim: SimState, input: SimInput, seconds: number) => {
  let s = sim;
  for (let t = 0; t < seconds; t += model.timestepS)
    s = step(model, s, withAutoClutch(model, s, input));
  return s;
};

const inFirst = () => shiftGear(model, startEngine(model, createInitialState(model)), 1);

describe('auto clutch', () => {
  it('does nothing on a scooter or in neutral', () => {
    const idle = { throttle: 1, brake: 0, clutchLever: 0 };
    expect(autoClutchLever(scooter, createInitialState(scooter), idle)).toBe(0);
    expect(autoClutchLever(model, createInitialState(model), idle)).toBe(0);
  });

  it('idles in gear at a standstill without stalling', () => {
    const s = ride(inFirst(), { throttle: 0, brake: 0, clutchLever: 0 }, 2);
    expect(s.engineRunning).toBe(true);
    expect(s.speedMps).toBeLessThan(0.1);
  });

  it('holds the clutch out on the brake so the engine revs, then pulls away', () => {
    const staged = ride(inFirst(), { throttle: 1, brake: 1, clutchLever: 0 }, 1);
    expect(staged.speedMps).toBeLessThan(0.1);
    expect(staged.engineRpm).toBeGreaterThan(model.engine.idleRpm * 2);
    const away = ride(staged, { throttle: 1, brake: 0, clutchLever: 0 }, 3);
    expect(away.engineRunning).toBe(true);
    expect(away.clutchState).toBe('locked');
    expect(away.speedMps).toBeGreaterThan(8);
  });

  it('lets go when braking to a halt in gear', () => {
    const moving = ride(inFirst(), { throttle: 1, brake: 0, clutchLever: 0 }, 2);
    const stopped = ride(moving, { throttle: 0, brake: 1, clutchLever: 0 }, 4);
    expect(stopped.speedMps).toBeLessThan(0.1);
    expect(stopped.engineRunning).toBe(true);
  });

  it('the rider can still pull the lever further', () => {
    const s = ride(inFirst(), { throttle: 1, brake: 0, clutchLever: 0 }, 3);
    expect(withAutoClutch(model, s, { throttle: 1, brake: 0, clutchLever: 1 }).clutchLever).toBe(1);
  });
});

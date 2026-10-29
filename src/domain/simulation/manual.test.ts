import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { autoRide, prepareLaunch, shouldUpshift } from '../dyno/autoRider';
import { chassisRun } from '../dyno/dynoRun';
import { mpsToKmh } from '../units';
import { shiftGear, startBlockedReason, startEngine } from './controls';
import { clutchEngagement } from './coupling';
import { buildModel, type ManualDrivetrain } from './model';
import { createInitialState, step } from './simulator';
import type { SimInput, SimState } from './types';

const model = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));
const drivetrain = model.drivetrain as ManualDrivetrain;

function run(seconds: number, input: (s: SimState) => SimInput, from: SimState): SimState {
  let s = from;
  for (let i = 0; i < Math.round(seconds / model.timestepS); i++) s = step(model, s, input(s));
  return s;
}

const idle = createInitialState(model);
const inFirst = (s: SimState) => shiftGear(model, s, 1);

describe('manual clutch lever', () => {
  it('is fully engaged when released and fully open when pulled', () => {
    expect(clutchEngagement(0)).toBe(1);
    expect(clutchEngagement(1)).toBe(0);
    const mid = clutchEngagement(0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe('manual gearbox', () => {
  it('starts in neutral and shifts sequentially N ↔ 1 … top', () => {
    expect(idle.gear).toBe(0);
    let s = idle;
    for (let i = 0; i < 10; i++) s = shiftGear(model, s, 1);
    expect(s.gear).toBe(drivetrain.gearRatios.length);
    for (let i = 0; i < 10; i++) s = shiftGear(model, s, -1);
    expect(s.gear).toBe(0);
  });

  it('revs freely in neutral without moving', () => {
    const s = run(1, () => ({ throttle: 1, brake: 0, clutchLever: 0 }), idle);
    expect(s.speedMps).toBe(0);
    expect(s.engineRpm).toBeGreaterThan(5000);
    expect(s.clutchState).toBe('disengaged');
  });

  it('stalls when the clutch is dumped in gear at idle with no throttle', () => {
    const s = run(2, () => ({ throttle: 0, brake: 1, clutchLever: 0 }), inFirst(idle));
    expect(s.engineRunning).toBe(false);
    expect(s.engineRpm).toBeLessThan(model.engine.idleRpm);
  });

  it('launches when the clutch is slipped with throttle', () => {
    let lever = 1;
    const s = run(
      4,
      (cur) => {
        if (cur.engineRpm > drivetrain.launchRpm)
          lever = Math.max(0, lever - model.timestepS / 0.8);
        return { throttle: 1, brake: 0, clutchLever: lever };
      },
      { ...inFirst(idle), clutchLever: 1 },
    );
    expect(s.engineRunning).toBe(true);
    expect(mpsToKmh(s.speedMps)).toBeGreaterThan(30);
    expect(s.clutchState).toBe('locked');
  });

  it('upshifting while locked drops rpm through clutch slip', () => {
    const moving = run(
      3,
      () => ({ throttle: 1, brake: 0, clutchLever: 0 }),
      run(1.5, (cur) => ({ throttle: 1, brake: 0, clutchLever: cur.timeS < 0.4 ? 1 : 0.3 }), {
        ...inFirst(idle),
        clutchLever: 1,
      }),
    );
    const shifted = shiftGear(model, moving, 1);
    expect(shifted.gear).toBe((moving.gear ?? 0) + 1);
    expect(shifted.clutchState).toBe('slipping');
    const after = run(0.3, () => ({ throttle: 1, brake: 0, clutchLever: 0 }), shifted);
    expect(after.engineRpm).toBeLessThan(moving.engineRpm);
    expect(after.clutchState).toBe('locked');
  });

  it('is a no-op on scooters', () => {
    const scooter = buildModel(makeConfig());
    const s = createInitialState(scooter);
    expect(shiftGear(scooter, s, 1)).toBe(s);
    expect(s.gear).toBeNull();
  });
});

describe('starter', () => {
  const stalled: SimState = { ...inFirst(idle), engineRunning: false, engineRpm: 0 };

  it('refuses in gear with the clutch out', () => {
    expect(startBlockedReason(stalled)).toBe('in-gear');
    expect(startEngine(model, stalled)).toBe(stalled);
  });

  it('starts in gear with the clutch pulled, or in neutral', () => {
    expect(startEngine(model, { ...stalled, clutchLever: 1 }).engineRunning).toBe(true);
    const neutral = startEngine(model, { ...stalled, gear: 0 });
    expect(neutral.engineRunning).toBe(true);
    expect(neutral.engineRpm).toBe(model.engine.idleRpm);
  });

  it('does nothing when already running', () => {
    expect(startBlockedReason(idle)).toBe('running');
    expect(startEngine(model, idle)).toBe(idle);
  });
});

describe('auto rider', () => {
  it('holds the clutch until launch rpm, then feeds it out', () => {
    const ready = prepareLaunch(model, idle);
    expect(ready.gear).toBe(1);
    expect(autoRide(model, ready).input.clutchLever).toBe(1);
    const revved = { ...ready, engineRpm: drivetrain.launchRpm + 100 };
    expect(autoRide(model, revved).input.clutchLever).toBeLessThan(1);
  });

  it('upshifts only when the next gear pushes at least as hard', () => {
    expect(shouldUpshift(model, drivetrain, 1, 4000)).toBe(false);
    expect(shouldUpshift(model, drivetrain, 1, model.engine.revLimitRpm)).toBe(true);
    expect(shouldUpshift(model, drivetrain, drivetrain.gearRatios.length, 8000)).toBe(false);
  });

  it('runs a full drag pass through the gears', () => {
    const result = chassisRun(model);
    const gears = new Set(result.points.map((p) => p.gear));
    expect(gears.has(1)).toBe(true);
    expect(gears.has(4)).toBe(true);
    expect(result.times.topSpeedKmh).toBeGreaterThan(100);
    expect(result.times.zeroTo100mS).toBeLessThan(9);
  });
});

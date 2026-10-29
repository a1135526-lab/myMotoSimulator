import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../test/fixtures/simConfig';
import { chassisRun } from '../dyno/dynoRun';
import { mpsToKmh } from '../units';
import { advance, MAX_STEPS_PER_ADVANCE } from './fixedStep';
import { NEUTRAL_INPUT } from './inputShaping';
import { buildModel, type SimModel } from './model';
import { createInitialState, step } from './simulator';
import type { SimInput, SimState } from './types';

const WOT: SimInput = { throttle: 1, brake: 0, clutchLever: 0 };

const cvtOf = (model: SimModel) => {
  if (model.drivetrain.kind !== 'scooter') throw new Error('expected a scooter');
  return model.drivetrain;
};

function run(model: SimModel, seconds: number, input: SimInput, from?: SimState): SimState[] {
  const states: SimState[] = [];
  let s = from ?? createInitialState(model);
  for (let i = 0; i < Math.round(seconds / model.timestepS); i++) {
    s = step(model, s, input);
    states.push(s);
  }
  return states;
}
const last = (states: SimState[]): SimState => {
  const s = states[states.length - 1];
  if (!s) throw new Error('no states');
  return s;
};

describe('simulator', () => {
  const model = buildModel(makeConfig());

  it('idles stationary with no input', () => {
    const s = last(run(model, 2, NEUTRAL_INPUT));
    expect(s.speedMps).toBe(0);
    expect(s.clutchState).toBe('disengaged');
    expect(s.engineRpm).toBeGreaterThan(model.engine.idleRpm - 200);
    expect(s.engineRpm).toBeLessThan(model.engine.idleRpm + 200);
  });

  it('launches through disengaged → slipping → locked', () => {
    const states = run(model, 4, WOT);
    const seen = new Set(states.map((s) => s.clutchState));
    expect([...seen]).toEqual(['disengaged', 'slipping', 'locked']);
    expect(mpsToKmh(last(states).speedMps)).toBeGreaterThan(30);
  });

  it('holds near the shift rpm while the variator upshifts', () => {
    const states = run(model, 8, WOT).filter(
      (s) => s.variatorPosition > 0.2 && s.variatorPosition < 0.8,
    );
    expect(states.length).toBeGreaterThan(0);
    for (const s of states) {
      expect(s.engineRpm).toBeGreaterThan(cvtOf(model).variator.fullLoadShiftRpm * 0.97);
      expect(s.engineRpm).toBeLessThan(
        cvtOf(model).variator.fullLoadShiftRpm * (1 + cvtOf(model).variator.shiftRise) * 1.02,
      );
    }
  });

  it('never exceeds the rev limit by more than one step of overshoot', () => {
    const config = makeConfig((t) => ({
      ...t,
      cvt: t.cvt && { ...t.cvt, variator: { lowRatio: 2.6, highRatio: 1.6 } },
    }));
    const m = buildModel(config);
    const maxRpm = Math.max(...run(m, 30, WOT).map((s) => s.engineRpm));
    expect(maxRpm).toBeLessThan(m.engine.revLimitRpm + 150);
  });

  it('brakes to a stop', () => {
    const moving = last(run(model, 6, WOT));
    const stopped = last(run(model, 6, { throttle: 0, brake: 1, clutchLever: 0 }, moving));
    expect(stopped.speedMps).toBe(0);
  });

  it('coasts down with the throttle closed', () => {
    const moving = last(run(model, 6, WOT));
    const coasting = last(run(model, 2, NEUTRAL_INPUT, moving));
    expect(coasting.speedMps).toBeLessThan(moving.speedMps);
  });

  it('reports wheel power below engine power (losses + slip)', () => {
    for (const s of run(model, 8, WOT).filter((x) => x.clutchState === 'locked')) {
      expect(s.wheelPowerW).toBeLessThanOrEqual(Math.max(0, s.enginePowerW) + 1e-6);
    }
  });
});

describe('tuning effects (property tests)', () => {
  const stock = chassisRun(makeConfig());

  it('heavier vehicle → slower 0–100 m and 0–400 m', () => {
    const heavy = chassisRun(makeConfig((t) => ({ ...t, extraMassKg: 40 })));
    expect(heavy.times.zeroTo100mS).toBeGreaterThan(stock.times.zeroTo100mS ?? Infinity);
    expect(heavy.times.zeroTo400mS).toBeGreaterThan(stock.times.zeroTo400mS ?? Infinity);
  });

  it('lighter rollers → higher rpm during the shift', () => {
    const shiftRpm = (rollers: number) => {
      const m = buildModel(
        makeConfig((t) => ({
          ...t,
          cvt: t.cvt && { ...t.cvt, rollerMassesG: t.cvt.rollerMassesG.map(() => rollers) },
        })),
      );
      const mid = run(m, 10, WOT).find((s) => s.variatorPosition > 0.5);
      return mid?.engineRpm ?? 0;
    };
    expect(shiftRpm(11)).toBeGreaterThan(shiftRpm(13));
  });

  it('stiffer clutch springs → higher engine rpm while slipping at launch', () => {
    const slipRpm = (engageRpm: number) => {
      const m = buildModel(
        makeConfig((t) => ({ ...t, cvt: t.cvt && { ...t.cvt, clutchEngageRpm: engageRpm } })),
      );
      return Math.max(
        ...run(m, 1.5, WOT)
          .filter((s) => s.clutchState === 'slipping')
          .map((s) => s.engineRpm),
      );
    };
    expect(slipRpm(3600)).toBeGreaterThan(slipRpm(3000));
  });

  it('ECU torque gain → more wheel power', () => {
    const tuned = chassisRun(
      makeConfig((t) => ({ ...t, ecu: { ...t.ecu, torqueGain: [{ rpm: 0, gain: 1.1 }] } })),
    );
    expect(tuned.peakWheelPowerW).toBeGreaterThan(stock.peakWheelPowerW);
  });
});

describe('fixed-step advance', () => {
  const model = buildModel(makeConfig());
  const initial = { sim: createInitialState(model), input: NEUTRAL_INPUT, accumulatorS: 0 };
  const press = { throttlePressed: true, brakePressed: false, clutchPressed: false };

  it('is frame-rate independent', () => {
    let a = initial;
    for (let i = 0; i < 60; i++) a = advance(model, a, press, 1 / 60).stepper;
    let b = initial;
    for (let i = 0; i < 144; i++) b = advance(model, b, press, 1 / 144).stepper;
    expect(a.sim.timeS).toBeCloseTo(b.sim.timeS, 2);
    expect(a.sim.speedMps).toBeCloseTo(b.sim.speedMps, 1);
  });

  it('keeps leftover time in the accumulator', () => {
    const { stepper, states } = advance(model, initial, press, model.timestepS * 2.5);
    expect(states).toHaveLength(2);
    expect(stepper.accumulatorS).toBeCloseTo(model.timestepS * 0.5);
  });

  it('caps steps after a long stall and ignores negative time', () => {
    expect(advance(model, initial, press, 60).states).toHaveLength(MAX_STEPS_PER_ADVANCE);
    expect(advance(model, initial, press, -1).states).toHaveLength(0);
  });

  it('ramps throttle progressively rather than snapping', () => {
    const { stepper } = advance(model, initial, press, 0.1);
    expect(stepper.input.throttle).toBeGreaterThan(0);
    expect(stepper.input.throttle).toBeLessThan(1);
  });
});

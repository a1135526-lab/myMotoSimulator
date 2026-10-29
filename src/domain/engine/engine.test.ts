import { describe, expect, it } from 'vitest';
import { TEST_BIKE } from '../../test/fixtures/testBike';
import type { EngineModel } from './engine';
import { engineTorqueNm, tunedWotTorqueNm } from './engine';
import { isFuelCut, REV_LIMIT_HYSTERESIS_RPM, tuneGainAt } from './ecu';
import { gainAt, wotTorqueAt } from './torqueCurve';

const curve = TEST_BIKE.engine.torqueCurve;
const engine: EngineModel = {
  torqueCurve: curve,
  ecuGain: [],
  intakeExhaustGain: [],
  idleRpm: TEST_BIKE.engine.idleRpm,
  revLimitRpm: TEST_BIKE.engine.revLimitRpm,
  inertiaKgM2: TEST_BIKE.engine.rotatingInertiaKgM2,
};

describe('wotTorqueAt', () => {
  it('returns exact values at sample points', () => {
    expect(wotTorqueAt(curve, 6500)).toBe(14);
  });

  it('interpolates linearly between points', () => {
    expect(wotTorqueAt(curve, 6250)).toBeCloseTo((13.8 + 14) / 2);
  });

  it('holds end values outside the sampled range', () => {
    expect(wotTorqueAt(curve, 500)).toBe(7);
    expect(wotTorqueAt(curve, 12000)).toBe(11.2);
  });

  it('returns 0 for an empty curve', () => {
    expect(wotTorqueAt([], 5000)).toBe(0);
  });
});

describe('gainAt', () => {
  it('is 1 for the empty (stock) curve', () => {
    expect(gainAt([], 7000)).toBe(1);
  });

  it('interpolates and multiplies ECU × intake gains', () => {
    const ecu = [
      { rpm: 4000, gain: 1 },
      { rpm: 8000, gain: 1.1 },
    ];
    expect(gainAt(ecu, 6000)).toBeCloseTo(1.05);
    expect(tuneGainAt(ecu, [{ rpm: 0, gain: 1.02 }], 8000)).toBeCloseTo(1.1 * 1.02);
  });
});

describe('isFuelCut', () => {
  const limit = 9000;
  it('cuts at the limit', () => {
    expect(isFuelCut(limit, limit, false)).toBe(true);
    expect(isFuelCut(limit - 1, limit, false)).toBe(false);
  });

  it('applies hysteresis before restoring fuel', () => {
    expect(isFuelCut(limit - 50, limit, true)).toBe(true);
    expect(isFuelCut(limit - REV_LIMIT_HYSTERESIS_RPM - 1, limit, true)).toBe(false);
  });
});

describe('engineTorqueNm', () => {
  it('gives zero combustion torque past the rev limit (fuel cut)', () => {
    expect(engineTorqueNm(engine, 9100, 1, true)).toBeLessThan(0);
    expect(engineTorqueNm(engine, 9100, 1, true)).toBeGreaterThan(-10);
  });

  it('scales with throttle', () => {
    const half = engineTorqueNm(engine, 6500, 0.5, false);
    const full = engineTorqueNm(engine, 6500, 1, false);
    expect(full).toBeCloseTo(14);
    expect(half).toBeLessThan(full);
    expect(half).toBeGreaterThan(0);
  });

  it('brakes the engine with the throttle closed above idle', () => {
    expect(engineTorqueNm(engine, 6000, 0, false)).toBeLessThan(0);
  });

  it('adds idle-governor torque below idle', () => {
    expect(engineTorqueNm(engine, engine.idleRpm - 400, 0, false)).toBeGreaterThan(0);
  });

  it('applies ECU gain to WOT torque', () => {
    const tuned = { ...engine, ecuGain: [{ rpm: 0, gain: 1.1 }] };
    expect(tunedWotTorqueNm(tuned, 6500)).toBeCloseTo(15.4);
  });
});

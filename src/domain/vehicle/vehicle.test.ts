import { describe, expect, it } from 'vitest';
import { STANDARD_GRAVITY } from '../units';
import {
  aeroDragN,
  brakeForceN,
  gradeForceN,
  longitudinalAccel,
  MAX_BRAKE_DECEL_MPS2,
  reflectedMassKg,
  rollingResistanceN,
  tractionLimitN,
  type VehicleBody,
} from './dynamics';
import { rollingCircumferenceM, rollingRadiusM, tireRadiusM } from './tire';

const body: VehicleBody = {
  massKg: 200,
  effectiveMassKg: 210,
  wheelRadiusM: 0.25,
  dragAreaM2: 0.6,
  rollingResistanceCoeff: 0.015,
  airDensity: 1.2,
  gradePercent: 0,
  tractionG: 1,
};

describe('tire', () => {
  const tire = { widthMm: 130, aspectRatio: 70, rimDiameterInch: 13 };

  it('computes radius from ISO size 130/70-13', () => {
    expect(tireRadiusM(tire)).toBeCloseTo((13 * 25.4) / 2 / 1000 + 0.091);
  });

  it('applies the loaded rolling-radius factor', () => {
    expect(rollingRadiusM(tire)).toBeLessThan(tireRadiusM(tire));
    expect(rollingCircumferenceM(tire)).toBeCloseTo(2 * Math.PI * rollingRadiusM(tire));
  });
});

describe('dynamics', () => {
  it('aero drag = ½ρC_dAv²', () => {
    expect(aeroDragN(body, 20)).toBeCloseTo(0.5 * 1.2 * 0.6 * 400);
  });

  it('rolling resistance = C_rr·m·g on the flat', () => {
    expect(rollingResistanceN(body)).toBeCloseTo(0.015 * 200 * STANDARD_GRAVITY);
  });

  it('grade force is positive uphill', () => {
    expect(gradeForceN({ ...body, gradePercent: 10 })).toBeGreaterThan(0);
    expect(gradeForceN(body)).toBeCloseTo(0);
  });

  it('brake force scales with input', () => {
    expect(brakeForceN(body, 1)).toBeCloseTo(MAX_BRAKE_DECEL_MPS2 * 200);
    expect(brakeForceN(body, 2)).toBeCloseTo(MAX_BRAKE_DECEL_MPS2 * 200);
  });

  it('never accelerates backwards from standstill', () => {
    expect(longitudinalAccel(body, 0, 0, 1)).toBe(0);
    expect(longitudinalAccel(body, 0, 10, 0)).toBe(0);
  });

  it('accelerates when drive force exceeds resistance', () => {
    const a = longitudinalAccel(body, 10, 1000, 0);
    const expected = (1000 - aeroDragN(body, 10) - rollingResistanceN(body)) / body.effectiveMassKg;
    expect(a).toBeCloseTo(expected);
  });

  it('extra reflected mass reduces acceleration', () => {
    expect(longitudinalAccel(body, 10, 1000, 0, 50)).toBeLessThan(
      longitudinalAccel(body, 10, 1000, 0),
    );
  });

  it('caps drive force at the grip limit (tractionG × m·g)', () => {
    const huge = 1e6;
    const dry = longitudinalAccel(body, 1, huge, 0);
    const wet = longitudinalAccel({ ...body, tractionG: 0.6 }, 1, huge, 0);
    expect(wet).toBeLessThan(dry);
    expect(tractionLimitN({ massKg: 200, tractionG: 0.5 })).toBeCloseTo(
      0.5 * 200 * STANDARD_GRAVITY,
    );
  });

  it('reflected mass = I·ratio²/r²', () => {
    expect(reflectedMassKg(0.1, 2, 0.25)).toBeCloseTo(6.4);
  });
});

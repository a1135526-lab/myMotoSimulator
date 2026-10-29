import { describe, expect, it } from 'vitest';
import { rpmToRadPerSec } from '../units';
import { buildClutch, clutchCapacityNm, CLUTCH_CAPACITY_MARGIN } from './clutch';
import { bellInertiaKgM2 } from './clutchBell';
import { bellRadSPerMps, engineRadSPerMps } from './finalDrive';
import {
  equilibriumPosition,
  fullLoadShiftRpm,
  holdRpm,
  ratioAt,
  stepPosition,
  type VariatorModel,
} from './variator';

const shift = (rollerTotalG: number, torqueSpringFactor = 1) =>
  fullLoadShiftRpm({
    stockShiftRpm: 7500,
    stockRollerTotalG: 78,
    rollerTotalG,
    torqueSpringFactor,
  });

describe('variator', () => {
  const v: VariatorModel = {
    lowRatio: 2.6,
    highRatio: 0.8,
    fullLoadShiftRpm: 7500,
    shiftRise: 0.15,
  };

  it('reproduces the stock shift rpm with stock parts', () => {
    expect(shift(78)).toBeCloseTo(7500);
  });

  it.each([
    [72, 66],
    [66, 60],
    [60, 54],
  ])('lighter rollers (%i g → %i g total) raise the shift rpm', (heavier, lighter) => {
    expect(shift(lighter)).toBeGreaterThan(shift(heavier));
  });

  it('follows the √(m_stock/m) force balance', () => {
    expect(shift(66)).toBeCloseTo(7500 * Math.sqrt(78 / 66));
  });

  it('a stiffer torque spring raises the shift rpm', () => {
    expect(shift(78, 1.15)).toBeGreaterThan(shift(78, 1));
  });

  it('shifts earlier at part throttle (torque cam)', () => {
    expect(holdRpm(v, 0.3)).toBeLessThan(holdRpm(v, 1));
    expect(holdRpm(v, 1)).toBe(7500);
  });

  it('stays at low ratio below the hold rpm and reaches high ratio above the band', () => {
    expect(equilibriumPosition(v, 5000, 1)).toBe(0);
    expect(equilibriumPosition(v, 9000, 1)).toBe(1);
    const mid = equilibriumPosition(v, 7600, 1);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('maps position to ratio between the limits', () => {
    expect(ratioAt(v, 0)).toBeCloseTo(2.6);
    expect(ratioAt(v, 1)).toBeCloseTo(0.8);
    expect(ratioAt(v, 0.5)).toBeCloseTo(Math.sqrt(2.6 * 0.8));
    expect(ratioAt(v, 2)).toBeCloseTo(0.8);
  });

  it('moves toward the target with a first-order lag', () => {
    const next = stepPosition(0, 1, 1 / 240);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(0.1);
    expect(stepPosition(0.5, 0.5, 1)).toBe(0.5);
  });
});

describe('clutch', () => {
  const make = (engageRpm: number) =>
    buildClutch({
      engageRpm,
      lockSpanRpm: 1200,
      lowRatio: 2.6,
      designShoeTorqueNm: 30,
      bellDiameterScale: 1,
    });
  const shoe = (engineRpm: number) => rpmToRadPerSec(engineRpm) / 2.6;

  it('transmits nothing below engagement', () => {
    expect(clutchCapacityNm(make(3000), shoe(2900))).toBe(0);
  });

  it('carries the design torque (with margin) at lock rpm', () => {
    expect(clutchCapacityNm(make(3000), shoe(4200))).toBeCloseTo(30 * CLUTCH_CAPACITY_MARGIN);
  });

  it('stiffer clutch springs raise the engagement rpm', () => {
    const stock = make(3000);
    const stiff = make(3600);
    expect(clutchCapacityNm(stock, shoe(3300))).toBeGreaterThan(0);
    expect(clutchCapacityNm(stiff, shoe(3300))).toBe(0);
  });

  it('a larger bell increases capacity', () => {
    const big = buildClutch({
      engageRpm: 3000,
      lockSpanRpm: 1200,
      lowRatio: 2.6,
      designShoeTorqueNm: 30,
      bellDiameterScale: 1.1,
    });
    expect(clutchCapacityNm(big, shoe(4000))).toBeGreaterThan(
      clutchCapacityNm(make(3000), shoe(4000)),
    );
  });
});

describe('clutch bell and final drive', () => {
  it('bell inertia grows with mass and diameter²', () => {
    expect(bellInertiaKgM2(130, 1)).toBeCloseTo(0.8 * 1 * 0.065 ** 2);
    expect(bellInertiaKgM2(130, 0.7)).toBeLessThan(bellInertiaKgM2(130, 1));
  });

  it('converts road speed to bell and engine speed', () => {
    expect(bellRadSPerMps(10, 0.25)).toBe(40);
    expect(engineRadSPerMps(2, 10, 0.25)).toBe(80);
  });
});

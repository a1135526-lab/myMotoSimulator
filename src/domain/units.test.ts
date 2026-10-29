import { describe, expect, it } from 'vitest';
import {
  clamp,
  gramsToKg,
  inchToMm,
  kgfmToNm,
  kmhToMps,
  mpsToKmh,
  nmToKgfm,
  percentToFraction,
  powerFromTorque,
  psToWatts,
  radPerSecToRpm,
  rpmToRadPerSec,
  wattsToPs,
} from './units';

describe('units', () => {
  it('round-trips rpm ↔ rad/s', () => {
    expect(rpmToRadPerSec(60)).toBeCloseTo(2 * Math.PI);
    expect(radPerSecToRpm(rpmToRadPerSec(7500))).toBeCloseTo(7500);
  });

  it('round-trips km/h ↔ m/s', () => {
    expect(kmhToMps(36)).toBeCloseTo(10);
    expect(mpsToKmh(kmhToMps(97.3))).toBeCloseTo(97.3);
  });

  it('converts power and torque units', () => {
    expect(wattsToPs(psToWatts(17.5))).toBeCloseTo(17.5);
    expect(nmToKgfm(kgfmToNm(1.5))).toBeCloseTo(1.5);
    expect(kgfmToNm(1)).toBeCloseTo(9.80665);
  });

  it('computes power from torque: 10 N·m at 9549 rpm ≈ 10 kW', () => {
    expect(powerFromTorque(10, 60_000 / (2 * Math.PI))).toBeCloseTo(10_000);
  });

  it('converts length, mass and percent', () => {
    expect(inchToMm(12)).toBeCloseTo(304.8);
    expect(gramsToKg(13)).toBeCloseTo(0.013);
    expect(percentToFraction(5)).toBeCloseTo(0.05);
  });

  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});

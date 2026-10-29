import { describe, expect, it } from 'vitest';
import { powerFromTorque, wattsToPs } from '@/domain';
import { synthesizeTorqueCurve } from './synthesizeTorqueCurve';

const inputs = {
  peakTorque: { nm: 55.7, rpm: 5250 },
  peakPower: { ps: 47.6, rpm: 7500 },
  revLimitRpm: 8750,
};

describe('synthesizeTorqueCurve', () => {
  const curve = synthesizeTorqueCurve(inputs);

  it('includes both peak rpms and reaches past the rev limit', () => {
    const rpms = curve.map((p) => p.rpm);
    expect(rpms).toContain(5250);
    expect(rpms).toContain(7500);
    expect(rpms[0]).toBe(1500);
    expect(rpms[rpms.length - 1]).toBeGreaterThanOrEqual(8750);
    expect(rpms).toEqual([...rpms].sort((a, b) => a - b));
  });

  it('peaks torque at the declared rpm', () => {
    const max = curve.reduce((a, b) => (b.torqueNm > a.torqueNm ? b : a));
    expect(max).toEqual({ rpm: 5250, torqueNm: 55.7 });
  });

  it('peaks power at the declared rpm with the declared value', () => {
    const power = curve.map((p) => ({
      rpm: p.rpm,
      ps: wattsToPs(powerFromTorque(p.torqueNm, p.rpm)),
    }));
    const max = power.reduce((a, b) => (b.ps > a.ps ? b : a));
    expect(max.rpm).toBe(7500);
    expect(max.ps).toBeCloseTo(47.6, 1);
  });

  it('honours the low-end fraction', () => {
    const flat = synthesizeTorqueCurve({ ...inputs, lowEndFraction: 0.8 });
    expect(flat[0]?.torqueNm).toBeCloseTo(55.7 * 0.8, 2);
  });
});

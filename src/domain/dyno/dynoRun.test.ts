import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../test/fixtures/simConfig';
import { buildModel } from '../simulation/model';
import { wattsToPs } from '../units';
import { chassisRun, DYNO_START_RPM, engineSweep } from './dynoRun';

describe('engineSweep', () => {
  const result = engineSweep(makeConfig());

  it('sweeps from the start rpm to the rev limit', () => {
    expect(result.points[0]?.rpm).toBe(DYNO_START_RPM);
    expect(result.points[result.points.length - 1]?.rpm).toBe(9000);
  });

  it('finds peaks matching the fixture curve', () => {
    expect(result.peakTorque.rpm).toBe(6500);
    expect(result.peakTorque.torqueNm).toBeCloseTo(14);
    expect(wattsToPs(result.peakPower.powerW)).toBeGreaterThan(14);
  });

  it('accepts a prebuilt model and respects a raised rev limit', () => {
    const model = buildModel(makeConfig((t) => ({ ...t, ecu: { ...t.ecu, revLimitRpm: 8000 } })));
    const capped = engineSweep(model);
    expect(capped.points[capped.points.length - 1]?.rpm).toBe(8000);
  });
});

describe('chassisRun', () => {
  const result = chassisRun(makeConfig());

  it('reaches a plausible top speed for a 150 cc scooter', () => {
    expect(result.times.topSpeedKmh).toBeGreaterThan(85);
    expect(result.times.topSpeedKmh).toBeLessThan(130);
  });

  it('samples every km/h with monotone speed', () => {
    const speeds = result.points.map((p) => p.speedKmh);
    expect(speeds[0]).toBe(1);
    speeds.slice(1).forEach((s, i) => expect(s).toBe((speeds[i] ?? 0) + 1));
  });

  it('wheel power peaks below crank power', () => {
    const crank = engineSweep(makeConfig()).peakPower.powerW;
    expect(result.peakWheelPowerW).toBeLessThan(crank);
    expect(result.peakWheelPowerW).toBeGreaterThan(crank * 0.7);
  });
});

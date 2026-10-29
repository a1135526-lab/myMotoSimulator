import { describe, expect, it } from 'vitest';
import type { BikeSpec, ScooterSpec } from '@/domain';
import { TEST_BIKE } from '../../test/fixtures/testBike';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { BikeSpecSchema, licenseClassFor, parseBikeSpec } from './bikeSpec.schema';

/** Shallow-ish override helper so each test changes exactly one thing. */
const withBike = (patch: (b: ScooterSpec) => BikeSpec): unknown =>
  patch(structuredClone(TEST_BIKE));

const issuesOf = (input: unknown): string[] => {
  const result = BikeSpecSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
};

describe('BikeSpecSchema', () => {
  it('accepts a valid bike', () => {
    expect(() => parseBikeSpec(TEST_BIKE)).not.toThrow();
  });

  it('rejects a torque curve with fewer than 15 points', () => {
    const bad = withBike((b) => ({
      ...b,
      engine: { ...b.engine, torqueCurve: b.engine.torqueCurve.slice(0, 10) },
    }));
    expect(issuesOf(bad)).toContain('engine.torqueCurve');
  });

  it('rejects non-ascending torque curve rpm', () => {
    const curve = [...TEST_BIKE.engine.torqueCurve];
    const [a, b] = [curve[3], curve[4]];
    if (!a || !b) throw new Error('fixture too short');
    curve[3] = b;
    curve[4] = a;
    const bad = withBike((bike) => ({ ...bike, engine: { ...bike.engine, torqueCurve: curve } }));
    expect(issuesOf(bad)).toContain('engine.torqueCurve.4.rpm');
  });

  it('rejects a torque curve that stops short of the rev limit', () => {
    const bad = withBike((b) => ({ ...b, engine: { ...b.engine, revLimitRpm: 9500 } }));
    expect(issuesOf(bad)).toContain('engine.torqueCurve');
  });

  it('rejects an inverted variator ratio range', () => {
    const bad = withBike((b) => ({
      ...b,
      cvt: { ...b.cvt, variator: { lowRatio: 0.8, highRatio: 2.6 } },
    }));
    expect(issuesOf(bad)).toContain('cvt.variator');
  });

  it('rejects a clutch that engages below idle', () => {
    const bad = withBike((b) => ({
      ...b,
      cvt: { ...b.cvt, clutch: { engageRpm: 1500, fullLockRpm: 4200 } },
    }));
    expect(issuesOf(bad)).toContain('cvt.clutch.engageRpm');
  });

  it('rejects non-kebab-case ids', () => {
    expect(issuesOf({ ...TEST_BIKE, id: 'SYM DRG' })).toContain('id');
  });

  it('requires sources for non-estimated data', () => {
    const bad = withBike((b) => ({
      ...b,
      engine: { ...b.engine, provenance: { verified: true, kind: 'official', sources: [] } },
    }));
    expect(issuesOf(bad)).toContain('engine.provenance.sources');
  });

  it('forbids marking estimated data as verified', () => {
    const bad = withBike((b) => ({
      ...b,
      chassis: { ...b.chassis, provenance: { verified: true, kind: 'estimated', sources: [] } },
    }));
    expect(issuesOf(bad)).toContain('chassis.provenance.verified');
  });

  it('throws a readable error naming the bike', () => {
    expect(() => parseBikeSpec({ id: 'broken-bike' })).toThrow(/Invalid BikeSpec "broken-bike"/);
  });
});

describe('BikeSpecSchema (manual bikes & plates)', () => {
  it('accepts the manual test bike', () => {
    expect(BikeSpecSchema.safeParse(MANUAL_TEST_BIKE).success).toBe(true);
  });

  it('rejects gear ratios that are not strictly descending', () => {
    const bad = {
      ...MANUAL_TEST_BIKE,
      gearbox: { ...MANUAL_TEST_BIKE.gearbox, gearRatios: [2.8, 1.9, 2.0, 1.1] },
    };
    expect(issuesOf(bad)).toContain('gearbox.gearRatios.2');
  });

  it('rejects a launch rpm outside idle..limit', () => {
    const bad = { ...MANUAL_TEST_BIKE, gearbox: { ...MANUAL_TEST_BIKE.gearbox, launchRpm: 500 } };
    expect(issuesOf(bad)).toContain('gearbox.launchRpm');
  });

  it('rejects a plate class that does not match displacement', () => {
    expect(issuesOf({ ...TEST_BIKE, licenseClass: 'red' })).toContain('licenseClass');
  });

  it('classifies plates by displacement', () => {
    expect(licenseClassFor(249)).toBe('white');
    expect(licenseClassFor(250)).toBe('yellow');
    expect(licenseClassFor(550)).toBe('yellow');
    expect(licenseClassFor(562)).toBe('red');
  });
});

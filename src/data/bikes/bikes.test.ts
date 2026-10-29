import { describe, expect, it } from 'vitest';
import {
  AIR_DENSITY_SEA_LEVEL,
  buildModel,
  createInitialState,
  NEUTRAL_INPUT,
  shapeInput,
  shiftGear,
  step,
  chassisRun,
  createStockTune,
  DEFAULT_TIMESTEP_S,
  engineSweep,
  wattsToPs,
  type BikeSpec,
  type LicenseClass,
} from '@/domain';
import { BikeSpecSchema } from '../schemas';
import { BIKES, DEFAULT_BIKE_ID, getBike } from './index';

const stockConfig = (bike: BikeSpec) => ({
  bike,
  tune: createStockTune(bike),
  environment: { airDensity: AIR_DENSITY_SEA_LEVEL, gradePercent: 0 },
  timestepS: DEFAULT_TIMESTEP_S,
});

/** Broad sanity bands per plate class: catches broken data, not fine calibration. */
const PLAUSIBLE: Record<
  LicenseClass,
  { topSpeedKmh: [number, number]; zeroTo100mS: [number, number] }
> = {
  white: { topSpeedKmh: [85, 150], zeroTo100mS: [6.5, 9.5] },
  yellow: { topSpeedKmh: [120, 200], zeroTo100mS: [5, 8] },
  red: { topSpeedKmh: [140, 260], zeroTo100mS: [4, 7] },
};

describe('bike registry', () => {
  it('has scooters and manual bikes on every plate class', () => {
    for (const kind of ['scooter', 'manual'] as const) {
      for (const plate of ['white', 'yellow', 'red'] as const) {
        expect(
          BIKES.some((b) => b.kind === kind && b.licenseClass === plate),
          `${kind}/${plate}`,
        ).toBe(true);
      }
    }
  });

  it('keeps the original SYM scooters first', () => {
    expect(BIKES.slice(0, 3).map((b) => b.id)).toEqual([
      'sym-jet-sl-125',
      'sym-drg-158',
      'sym-mmbcu-158',
    ]);
  });

  it('resolves the default bike and rejects unknown ids', () => {
    expect(getBike(DEFAULT_BIKE_ID).id).toBe(DEFAULT_BIKE_ID);
    expect(() => getBike('nope')).toThrow(/Unknown bike/);
  });
});

describe.each(BIKES.map((b) => [b.model, b] as const))('%s', (_, bike) => {
  it('passes Zod validation', () => {
    expect(BikeSpecSchema.safeParse(bike).success).toBe(true);
  });

  it('torque curve reproduces the declared peak torque', () => {
    const peak = engineSweep(stockConfig(bike)).peakTorque;
    expect(peak.torqueNm).toBeCloseTo(bike.engine.peakTorque.nm, 2);
    expect(peak.rpm).toBe(bike.engine.peakTorque.rpm);
  });

  it('torque curve reproduces the declared peak power (±2 %) at the declared rpm', () => {
    const peak = engineSweep(stockConfig(bike)).peakPower;
    expect(wattsToPs(peak.powerW) / bike.engine.peakPower.ps).toBeGreaterThan(0.98);
    expect(wattsToPs(peak.powerW) / bike.engine.peakPower.ps).toBeLessThan(1.02);
    expect(peak.rpm).toBe(bike.engine.peakPower.rpm);
  });

  it('flags every section that is not fully verified', () => {
    const drivetrain = bike.kind === 'scooter' ? bike.cvt : bike.gearbox;
    for (const section of [bike.engine, drivetrain, bike.chassis]) {
      if (section.provenance.kind === 'estimated') expect(section.provenance.verified).toBe(false);
    }
  });

  it('simulates a plausible stock run for its plate class', () => {
    const { times } = chassisRun(stockConfig(bike));
    const range = PLAUSIBLE[bike.licenseClass];
    expect(times.topSpeedKmh).toBeGreaterThan(range.topSpeedKmh[0]);
    expect(times.topSpeedKmh).toBeLessThan(range.topSpeedKmh[1]);
    expect(times.zeroTo100mS).toBeGreaterThan(range.zeroTo100mS[0]);
    expect(times.zeroTo100mS).toBeLessThan(range.zeroTo100mS[1]);
  });
});

/**
 * Calibration: where a bike has published performance, the stock simulation
 * must land within ±10 %.
 */
const CALIBRATION_TOLERANCE = 0.1;
const calibrated = BIKES.filter((b) => b.referencePerformance);

describe.each(calibrated.map((b) => [b.model, b] as const))('%s calibration', (_, bike) => {
  const ref = bike.referencePerformance;
  const { times } = chassisRun(stockConfig(bike));
  const checks = [
    ['topSpeedKmh', ref?.topSpeedKmh, times.topSpeedKmh],
    ['zeroTo60S', ref?.zeroTo60S, times.zeroTo60S],
    ['zeroTo100S', ref?.zeroTo100S, times.zeroTo100S],
    ['zeroTo100mS', ref?.zeroTo100mS, times.zeroTo100mS],
    ['zeroTo400mS', ref?.zeroTo400mS, times.zeroTo400mS],
  ] as const;

  it.each(checks.filter(([, expected]) => expected !== undefined))(
    '%s within ±10 %% of reference',
    (_name, expected, actual) => {
      expect(actual).toBeDefined();
      const error = Math.abs((actual ?? 0) - (expected ?? 0)) / (expected ?? 1);
      expect(error).toBeLessThanOrEqual(CALIBRATION_TOLERANCE);
    },
  );
});

/**
 * Owner observation, JET SL 125 (2026-10-29): WOT shift starts around the
 * stock shift rpm, rpm keeps climbing steadily, and reads 8750–9000 at top speed.
 */
describe('SYM JET SL 125 owner-observed rpm behaviour', () => {
  const jet = getBike('sym-jet-sl-125');
  if (jet.kind !== 'scooter') throw new Error('JET SL must be a scooter');
  const bike = jet;
  const { points } = chassisRun(stockConfig(bike));
  const rpmAt = (kmh: number) => points.find((p) => p.speedKmh === kmh)?.engineRpm ?? 0;
  const top = points[points.length - 1];

  it('holds near the stock shift rpm when the shift begins', () => {
    expect(rpmAt(45)).toBeGreaterThan(bike.cvt.stockShiftRpm);
    expect(rpmAt(45)).toBeLessThan(bike.cvt.stockShiftRpm + 600);
  });

  it('keeps climbing through the shift instead of flattening out', () => {
    expect(rpmAt(80) - rpmAt(50)).toBeGreaterThan(300);
  });

  it('reads 8750–9000 rpm at top speed', () => {
    expect(top?.engineRpm).toBeGreaterThanOrEqual(8750);
    expect(top?.engineRpm).toBeLessThanOrEqual(9000);
  });
});

/**
 * Keyboard launch on every manual bike: clutch in, throttle pinned at the
 * limiter, then let the lever out at the keyboard release rate. Big bikes must
 * spin the tyre / pull away, not bog to a stall.
 */
describe.each(BIKES.filter((b) => b.kind === 'manual').map((b) => [b.model, b] as const))(
  '%s keyboard launch',
  (_, bike) => {
    it('pulls away without stalling when the clutch is released at the limiter', () => {
      const model = buildModel(stockConfig(bike));
      // Like a rider: pull the clutch in first, then select 1st.
      let input = { ...NEUTRAL_INPUT, clutchLever: 1 };
      let sim = shiftGear(model, { ...createInitialState(model), clutchLever: 1 }, 1);
      const hold = (seconds: number, clutchPressed: boolean) => {
        for (let i = 0; i < seconds / model.timestepS; i++) {
          input = shapeInput(
            input,
            { throttlePressed: true, brakePressed: false, clutchPressed },
            model.timestepS,
          );
          sim = step(model, sim, input);
        }
      };
      hold(1.5, true);
      hold(3, false);
      expect(sim.engineRunning).toBe(true);
      expect(sim.speedMps).toBeGreaterThan(10);
    });

    it('never reports more wheel power than the engine makes', () => {
      const { points, peakWheelPowerW } = chassisRun(stockConfig(bike));
      const crank = engineSweep(stockConfig(bike)).peakPower.powerW;
      expect(peakWheelPowerW).toBeLessThan(crank);
      for (const p of points) expect(p.wheelPowerW).toBeLessThan(crank);
    });
  },
);

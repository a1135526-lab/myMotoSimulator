import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { buildModel } from '../simulation/model';
import { buildCircuit } from './geometry';
import { createRider, type CircuitRider } from './rider';
import { DRIFT_HELD_S, EMPTY_TALLY, stepTally, tallyShift, type RideTally } from './rideTally';

const geo = buildCircuit(
  [
    [0, 0],
    [300, 0],
    [300, 300],
    [0, 300],
  ].map(([x, z]) => ({ x: x as number, z: z as number })),
  6,
);
const model = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));
const base = createRider(model, geo, 100, 0);
const DT = 1 / 240;

const run = (tally: RideTally, from: CircuitRider, to: CircuitRider, steps: number) => {
  let t = tally;
  for (let i = 0; i < steps; i++) t = stepTally(t, i === 0 ? from : to, to, null, DT);
  return t;
};

describe('ride tally', () => {
  it('counts each trip off the tarmac once, and the time spent there', () => {
    const off = { ...base, surface: 'runoff' as const };
    const t = run(EMPTY_TALLY, base, off, 240);
    expect(t.excursions).toBe(1);
    expect(t.offTrackS).toBeCloseTo(1, 2);
    expect(run(t, off, base, 1).excursions).toBe(1);
  });

  it('a slide held and ridden out on the tarmac is a drift; a short twitch is not', () => {
    const sliding = { ...base, drift: 0.9 };
    const held = run(EMPTY_TALLY, base, sliding, Math.ceil((DRIFT_HELD_S + 0.1) / DT));
    expect(run(held, sliding, base, 1).drifts).toBe(1);
    const twitch = run(EMPTY_TALLY, base, sliding, 10);
    expect(run(twitch, sliding, base, 1).drifts).toBe(0);
  });

  it('a slide that ends on the grass does not count', () => {
    const sliding = { ...base, drift: 0.9 };
    const held = run(EMPTY_TALLY, base, sliding, Math.ceil((DRIFT_HELD_S + 0.1) / DT));
    const off = { ...base, surface: 'runoff' as const };
    expect(run(held, sliding, off, 1).drifts).toBe(0);
  });

  it('each corner is judged on its slowest point against the pro, capped by your top speed', () => {
    const at = (v: number) => ({ ...base, sim: { ...base.sim, speedMps: v } });
    let t = stepTally(EMPTY_TALLY, base, at(40), null, DT);
    // In the corner: you dip to 18 m/s where the pro holds 20.
    for (const [v, ref] of [
      [30, 25],
      [18, 20],
      [25, 30],
    ] as const) {
      t = stepTally(t, base, at(v), ref, DT);
    }
    t = stepTally(t, base, at(30), null, DT);
    expect(t.corners).toBe(1);
    expect(t.cornerPace).toBeCloseTo(0.9);
    // A slow bike that never reaches the pro's corner speed isn't marked down for it.
    let slow = stepTally(EMPTY_TALLY, base, at(15), null, DT);
    slow = stepTally(slow, base, at(14), 20, DT);
    slow = stepTally(slow, base, at(15), null, DT);
    expect(slow.cornerPace).toBeCloseTo(14 / 15);
  });

  it('an upshift at the redline is good, one far too early is not', () => {
    const sim = { ...base.sim, gear: 2, engineRpm: model.engine.revLimitRpm - 100 };
    const late = tallyShift(EMPTY_TALLY, model, sim, 1);
    expect([late.upshifts, late.goodUpshifts]).toEqual([1, 1]);
    const early = tallyShift(EMPTY_TALLY, model, { ...sim, engineRpm: 3000 }, 1);
    expect([early.upshifts, early.goodUpshifts]).toEqual([1, 0]);
    expect(tallyShift(EMPTY_TALLY, model, sim, -1)).toBe(EMPTY_TALLY);
  });
});

import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { buildModel } from '../simulation/model';
import { buildCircuit } from './geometry';
import { surfaceAt } from './lateral';
import { createRider, stepRider, type CircuitRider } from './rider';

const geo = buildCircuit(
  [
    [0, 0],
    [200, 0],
    [240, 40],
    [240, 160],
    [200, 200],
    [0, 200],
    [-40, 160],
    [-40, 40],
  ].map(([x, z]) => ({ x: x as number, z: z as number })),
  6,
);
const limits = { halfWidth: 6, runoffM: 15, gripG: 1.2 };
const manual = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));

describe('rider control', () => {
  const ctx = {
    model: manual,
    geo,
    limits,
    clockS: 0,
    laps: 1,
    assist: false,
    autoShift: true,
  };
  const riding = (d: number, psi: number, speedMps: number) => {
    const r = createRider(manual, geo, 20, d);
    return {
      ...r,
      sim: { ...r.sim, speedMps, gear: 3, engineRpm: 7000, clutchState: 'locked' as const },
      lat: { ...r.lat, psi },
      surface: surfaceAt(limits, d),
    };
  };
  const ride = (
    rider: CircuitRider,
    seconds: number,
    input: { throttle: number; brake: number },
    steer: number,
    drift = false,
  ) => {
    let r: CircuitRider = rider;
    const stats = { maxDrift: 0, hitBarrier: false };
    for (let i = 0; i < seconds * 240; i++) {
      r = stepRider(ctx, r, { ...input, clutchLever: 0 }, steer, drift);
      stats.maxDrift = Math.max(stats.maxDrift, Math.abs(r.drift));
      stats.hitBarrier ||= r.hitAtS !== null;
    }
    return { r, ...stats };
  };

  it('off the tarmac, steering hauls the bike back before the barrier', () => {
    // On the grass on the right, still heading away from the track.
    const start = riding(-(limits.halfWidth + 2), -0.25, 18);
    expect(start.surface).toBe('runoff');
    const { r, hitBarrier } = ride(start, 1.5, { throttle: 0.3, brake: 0 }, 1);
    expect(hitBarrier).toBe(false);
    expect(r.surface).toBe('track');
  });

  it('the grass bogs a fast bike down: cutting across it is never quicker', () => {
    // Flat out, straight along the grass beside the tarmac vs on it.
    const grass = ride(riding(limits.halfWidth + 6, 0, 30), 1.5, { throttle: 1, brake: 0 }, 0).r;
    const tarmac = ride(riding(0, 0, 30), 1.5, { throttle: 1, brake: 0 }, 0).r;
    expect(grass.surface).toBe('runoff');
    expect(grass.sim.speedMps).toBeLessThan(12);
    expect(tarmac.sim.speedMps).toBeGreaterThan(29);
    expect(grass.progressM).toBeLessThan(tarmac.progressM - 15);
  });

  it('braking into a turn slides and turns tighter than leaning alone (assist off)', () => {
    const start = riding(0, 0, 30);
    const leaning = ride(start, 0.6, { throttle: 0, brake: 0 }, 1).r;
    const sliding = ride(start, 0.6, { throttle: 0, brake: 1 }, 1, true).r;
    expect(Math.abs(sliding.drift)).toBeGreaterThan(0.9);
    expect(sliding.lat.lean).toBeGreaterThan(0.5);
    expect(sliding.lat.psi).toBeGreaterThan(leaning.lat.psi);
  });

  it('a slide is held for as long as the brake is', () => {
    const start = riding(0, 0, 30);
    const kicked = ride(start, 0.3, { throttle: 0, brake: 1 }, 1, true).r;
    expect(Math.abs(kicked.drift)).toBeGreaterThan(0.9);
    // Steer centred, a dab of throttle: still sideways two seconds later, still moving.
    const held = ride(
      { ...kicked, lat: { ...kicked.lat, d: 0, psi: 0, lean: 0 } },
      2,
      { throttle: 0.4, brake: 1 },
      0,
      true,
    ).r;
    expect(Math.abs(held.drift)).toBeGreaterThan(0.9);
    expect(held.sim.speedMps).toBeGreaterThan(12);
  });
});

describe('hills', () => {
  const loop = geo.samples.filter((_, i) => i % 10 === 0).map(({ x, z }) => ({ x, z }));
  const hilly = (keys: readonly (readonly [number, number])[]) => ({
    model: manual,
    geo: buildCircuit(loop, 6, undefined, keys),
    limits,
    clockS: 0,
    laps: 1,
    assist: false,
    autoShift: true,
  });
  /** Speed after rolling 2 s off the throttle from 20 m/s near the start. */
  const coast = (keys: readonly (readonly [number, number])[]) => {
    const ctx = hilly(keys);
    const r0 = createRider(manual, ctx.geo, 20, 0);
    let r: CircuitRider = {
      ...r0,
      sim: { ...r0.sim, speedMps: 20, gear: 3, engineRpm: 7000, clutchState: 'locked' },
    };
    for (let i = 0; i < 2 * 240; i++) {
      r = stepRider(ctx, r, { throttle: 0, brake: 0, clutchLever: 0 }, 0);
    }
    return r.sim.speedMps;
  };

  it('a climb slows the bike and a drop speeds it up', () => {
    const flat = coast([]);
    const up = coast([
      [0, 0],
      [0.25, 25],
      [0.5, 25],
      [0.75, 0],
    ]);
    const down = coast([
      [0, 25],
      [0.25, 0],
      [0.5, 0],
      [0.75, 25],
    ]);
    expect(up).toBeLessThan(flat - 1);
    expect(down).toBeGreaterThan(flat + 1);
  });
});

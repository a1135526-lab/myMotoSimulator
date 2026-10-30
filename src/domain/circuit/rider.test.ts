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
      stats.hitBarrier ||= r.crashedUntilS !== null;
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

  it('a slide is held for as long as the brake is', () => {
    const start = riding(0, 0, 30);
    const kicked = ride(start, 0.5, { throttle: 0, brake: 1 }, 1, true).r;
    expect(Math.abs(kicked.drift)).toBeGreaterThan(0.9);
    // Steer centred, a dab of throttle: still sideways two seconds later, still moving.
    const held = ride(
      { ...kicked, lat: { ...kicked.lat, d: 0, psi: 0 } },
      2,
      { throttle: 0.4, brake: 1 },
      0,
      true,
    ).r;
    expect(Math.abs(held.drift)).toBeGreaterThan(0.9);
    expect(held.sim.speedMps).toBeGreaterThan(12);
  });
});

import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../test/fixtures/simConfig';
import { TEST_CITY_DATA, TEST_CITY_OPTIONS } from '../../test/fixtures/testCity';
import { buildModel } from '../simulation/model';
import { buildCity } from './cityBuild';
import { citySurfaceAt, deckHeightAt, nearestRoadPose } from './cityQueries';
import {
  createFreeRider,
  respawnRider,
  stepFreeRider,
  type FreeRider,
  type FreeRideContext,
} from './freeRide';
import { heightAlong } from './roadNetwork';

const map = buildCity(TEST_CITY_DATA, TEST_CITY_OPTIONS);
const scooter = buildModel(makeConfig());
const ctx: FreeRideContext = {
  model: scooter,
  map,
  gripG: 1.05,
  clockS: 0,
  autoShift: true,
  autoClutch: false,
};
const flyover = map.edges.find((e) => e.name === '高架路');

/** A rider set down at a spot, heading, height and speed. */
function placed(x: number, z: number, heading: number, y: number, speedMps: number): FreeRider {
  const r = createFreeRider(scooter, map);
  return { ...r, x, z, y, heading, sim: { ...r.sim, speedMps, gear: r.sim.gear } };
}

function ride(r: FreeRider, seconds: number, until: (r: FreeRider) => boolean) {
  let rider = r;
  for (let i = 0; i < seconds * 240 && !until(rider); i++) {
    rider = stepFreeRider(ctx, rider, { throttle: 0.6, brake: 0, clutchLever: 0 }, 0, false);
  }
  return rider;
}

describe('elevated roads', () => {
  it('carry their heights, ramps included', () => {
    expect(flyover?.heights).toHaveLength(9);
    if (!flyover) return;
    expect(heightAlong(flyover, 0)).toBe(0);
    expect(heightAlong(flyover, 45)).toBeCloseTo(4.75);
    expect(heightAlong(flyover, 120)).toBe(6.5);
    expect(map.overpasses).toHaveLength(1);
  });

  it('are only reached from their own level', () => {
    // Over 南北1路: the street below at 0, the deck at 6.5.
    expect(citySurfaceAt(map, 120, 60, 0)).toBe('road');
    expect(citySurfaceAt(map, 120, 60, 6.5)).toBe('road');
    expect(deckHeightAt(map, 120, 60, 6.5)).toBe(6.5);
    expect(deckHeightAt(map, 120, 60, 0)).toBe(0);
    // Under the deck between the streets: no road for someone on the ground…
    expect(citySurfaceAt(map, 180, 60, 0)).not.toBe('road');
    // …and off the edge of the deck, the parapet.
    expect(citySurfaceAt(map, 180, 75, 6.5)).toBe('building');
  });

  it('a rider climbs the ramp and stays up over the crossing streets', () => {
    let r = placed(62, 60, 0, 0, 8);
    r = ride(r, 30, (x) => x.x >= 200);
    expect(r.crashedUntilS).toBeNull();
    expect(r.x).toBeGreaterThan(200);
    expect(r.y).toBeCloseTo(6.5, 1);
    // Back down the far ramp to the ground.
    r = ride(r, 30, (x) => x.x >= 299);
    expect(r.y).toBeLessThan(0.5);
  });

  it('a rider on the street below passes under it', () => {
    let r = placed(120, 10, Math.PI / 2, 0, 8);
    r = ride(r, 30, (x) => x.z >= 110);
    expect(r.crashedUntilS).toBeNull();
    expect(r.z).toBeGreaterThan(110);
    expect(r.y).toBe(0);
  });

  it('brushing the parapet scrapes along it instead of throwing you off', () => {
    // On the deck, aimed a little to the right: into the parapet before the far ramp.
    let r = placed(125, 60, 0.08, 6.5, 12);
    r = ride(r, 30, (x) => x.x >= 235);
    expect(r.crashedUntilS).toBeNull();
    expect(r.x).toBeGreaterThan(235);
    expect(r.y).toBeCloseTo(6.5, 1);
  });

  it('after a fall on the deck you are put back on the deck, not the street below', () => {
    const r = respawnRider(ctx, placed(120, 62, 0, 6.5, 0));
    expect(r.y).toBeCloseTo(6.5, 1);
    expect(Math.abs(r.z - 60)).toBeLessThan(6);
  });

  it('respawning on it puts you at its height', () => {
    const pose = nearestRoadPose(map, 180, 61, 0, (e) => e.name === '高架路');
    expect(pose.y).toBeCloseTo(6.5);
  });
});

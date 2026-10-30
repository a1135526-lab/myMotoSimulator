import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { TEST_CITY_DATA, TEST_CITY_OPTIONS } from '../../test/fixtures/testCity';
import type { CircuitCommand } from '../circuit/circuitRace';
import { buildModel } from '../simulation/model';
import type { CitySurface } from './city';
import { buildCity } from './cityBuild';
import { citySurfaceAt, isSolid } from './cityQueries';
import { createFreeRider, stepFreeRider, type FreeRideContext } from './freeRide';
import {
  advanceStreet,
  clearStreetDestination,
  createStreetRide,
  resetStreetRider,
  setStreetDestination,
  startStreetEngine,
  type StreetSettings,
} from './streetRide';
import { createTraffic, hitCar, stepTraffic } from './traffic';

const map = buildCity(TEST_CITY_DATA, TEST_CITY_OPTIONS);
const scooter = buildModel(makeConfig());
const manual = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));
const idle: CircuitCommand = {
  throttlePressed: false,
  brakePressed: false,
  clutchPressed: false,
  steerLeftPressed: false,
  steerRightPressed: false,
};
const settings: StreetSettings = {
  gripG: 1.05,
  autoShift: true,
  autoClutch: false,
  trafficCount: 0,
  seed: 1,
};
/** Advance in frames, like the render loop does (one call is capped in steps). */
const rideFor = (
  model: typeof scooter,
  state: ReturnType<typeof createStreetRide>,
  command: CircuitCommand,
  seconds: number,
) => {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60) s = advanceStreet(map, model, s, command, 1 / 60);
  return s;
};

describe('free riding', () => {
  const ctx = (patch: Partial<FreeRideContext> = {}): FreeRideContext => ({
    model: scooter,
    map,
    gripG: 1.05,
    clockS: 0,
    autoShift: false,
    autoClutch: false,
    ...patch,
  });

  it('rides off along the road and leans into a turn', () => {
    let r = createFreeRider(scooter, map);
    const start = { x: r.x, z: r.z };
    for (let i = 0; i < 240 * 3; i++) {
      r = stepFreeRider(ctx(), r, { throttle: 1, brake: 0, clutchLever: 0 }, 0, false);
    }
    expect(r.sim.speedMps).toBeGreaterThan(8);
    // Spawned on 南北0路 heading south: z goes up.
    expect(r.z - start.z).toBeGreaterThan(15);
    const before = r.heading;
    for (let i = 0; i < 120; i++) {
      r = stepFreeRider(ctx(), r, { throttle: 0.5, brake: 0, clutchLever: 0 }, 1, false);
    }
    expect(r.lean).toBeGreaterThan(0.2);
    expect(r.heading).toBeLessThan(before); // a left turn lowers the heading
  });

  it('crashes into a building and is put back on a road', () => {
    const base = createFreeRider(scooter, map);
    let r = {
      ...base,
      x: 12,
      z: 280,
      heading: 0,
      surface: 'sidewalk' as CitySurface,
      sim: { ...base.sim, speedMps: 12 },
    };
    for (let i = 0; i < 240 && r.crashedUntilS === null; i++) {
      r = stepFreeRider(ctx(), r, { throttle: 0, brake: 0, clutchLever: 0 }, 0, false);
    }
    expect(r.crashedUntilS).not.toBeNull();
    const back = stepFreeRider(ctx({ clockS: 10 }), r, r.input, 0, false);
    expect(back.crashedUntilS).toBeNull();
    expect(citySurfaceAt(map, back.x, back.z)).toBe('road');
  });

  it('tracks trip distance and top speed', () => {
    let s = createStreetRide(map, scooter, settings);
    s = rideFor(scooter, s, { ...idle, throttlePressed: true }, 4);
    expect(s.rider.distanceM).toBeGreaterThan(10);
    expect(s.rider.topSpeedKmh).toBeGreaterThan(20);
  });

  it('manual bikes shift themselves with auto shift, and can be restarted', () => {
    let s = createStreetRide(map, manual, settings);
    s = rideFor(manual, s, { ...idle, throttlePressed: true }, 6);
    expect(s.rider.sim.gear).toBeGreaterThanOrEqual(2);
    expect(startStreetEngine(manual, s).rider.sim.engineRunning).toBe(true);
    expect(resetStreetRider(map, manual, s).rider.sim.speedMps).toBe(0);
  });

  it('carries a sat-nav that follows the ride and can be cleared', () => {
    let s = createStreetRide(map, scooter, settings);
    s = setStreetDestination(map, s, { x: 0, z: 330, label: '南邊' });
    expect(s.nav?.route.lengthM).toBeGreaterThan(100);
    s = rideFor(scooter, s, { ...idle, throttlePressed: true }, 4);
    expect(s.nav?.progressM).toBeGreaterThan(10);
    expect(clearStreetDestination(s).nav).toBeNull();
  });
});

describe('traffic', () => {
  const rider = map.spawn;

  it('places cars on roads cars use, away from the rider', () => {
    const t = createTraffic(map, 12, 3, rider);
    expect(t.cars.length).toBeGreaterThan(6);
    for (const c of t.cars) {
      expect(citySurfaceAt(map, c.x, c.z)).toBe('road');
      expect(Math.hypot(c.x - rider.x, c.z - rider.z)).toBeGreaterThan(30);
      expect(map.edges[c.pos.edge]?.name).not.toBe('單行巷');
    }
  });

  it('keeps cars on the roads as they drive and turn at junctions', () => {
    let t = createTraffic(map, 12, 3, rider);
    const start = t.cars.map((c) => c.pos.edge);
    for (let i = 0; i < 60 * 40; i++) t = stepTraffic(map, t, 1 / 60, null, i, rider);
    let changedRoad = 0;
    t.cars.forEach((c, i) => {
      expect(isSolid(citySurfaceAt(map, c.x, c.z))).toBe(false);
      expect(citySurfaceAt(map, c.x, c.z)).not.toBe('building');
      if (c.pos.edge !== start[i]) changedRoad++;
    });
    expect(changedRoad).toBeGreaterThan(t.cars.length / 2);
  });

  it('a car stops for a rider standing in its lane', () => {
    const t = createTraffic(map, 1, 11, rider);
    const car = t.cars[0];
    if (!car) throw new Error('no car');
    const ahead = { x: car.x + Math.cos(car.heading) * 20, z: car.z + Math.sin(car.heading) * 20 };
    let state = t;
    for (let i = 0; i < 60 * 4; i++) state = stepTraffic(map, state, 1 / 60, ahead, i, ahead);
    expect(state.cars[0]?.speedMps).toBe(0);
    expect(hitCar(state, ahead.x, ahead.z)).toBeNull();
  });

  it('riding into a moving car is a crash', () => {
    const s0 = createStreetRide(map, scooter, { ...settings, trafficCount: 1, seed: 11 });
    const car = s0.traffic.cars[0];
    if (!car) throw new Error('no car');
    const s = {
      ...s0,
      traffic: { ...s0.traffic, cars: [{ ...car, speedMps: 10 }] },
      rider: { ...s0.rider, x: car.x, z: car.z },
    };
    const after = advanceStreet(map, scooter, s, idle, 0.1);
    expect(after.rider.crashedUntilS).not.toBeNull();
  });
});

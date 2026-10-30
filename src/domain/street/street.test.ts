import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import type { CircuitCommand } from '../circuit/circuitRace';
import { buildModel } from '../simulation/model';
import { generateCity, type CitySpec, type CitySurface } from './city';
import { blockAt, citySurfaceAt, districtAt, isSolid, nearestRoadPose } from './cityQueries';
import { createFreeRider, stepFreeRider, type FreeRideContext } from './freeRide';
import {
  advanceStreet,
  createStreetRide,
  resetStreetRider,
  startStreetEngine,
  type StreetSettings,
} from './streetRide';
import { createTraffic, hitCar, stepTraffic } from './traffic';

const SPEC: CitySpec = {
  name: 'Test City',
  seed: 7,
  blocksX: 6,
  blocksZ: 5,
  blockM: 110,
  streetWidthM: 10,
  avenueWidthM: 18,
  avenueEvery: 3,
  sidewalkM: 4,
  expresswayWidthM: 24,
  promenadeM: 20,
  seaM: 200,
  districtNames: {
    downtown: '市中心',
    commercial: '商業區',
    residential: '住宅區',
    industrial: '工業區',
    park: '公園',
    waterfront: '濱海區',
  },
};
const map = generateCity(SPEC);
const scooter = buildModel(makeConfig());
const manual = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));

const idle: CircuitCommand = {
  throttlePressed: false,
  brakePressed: false,
  clutchPressed: false,
  steerLeftPressed: false,
  steerRightPressed: false,
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

const settings: StreetSettings = {
  gripG: 1.05,
  autoShift: true,
  autoClutch: false,
  trafficCount: 0,
  seed: 1,
};

describe('city generation', () => {
  it('is deterministic for a seed and changes with it', () => {
    const again = generateCity(SPEC);
    expect(again.blocks.map((b) => b.buildings.length)).toEqual(
      map.blocks.map((b) => b.buildings.length),
    );
    const other = generateCity({ ...SPEC, seed: 8 });
    expect(other.blocks.map((b) => b.district)).not.toEqual(map.blocks.map((b) => b.district));
  });

  it('lays a grid of roads plus an expressway, with every block between them', () => {
    expect(map.roads.filter((r) => r.axis === 'z')).toHaveLength(SPEC.blocksX + 1);
    expect(map.roads.filter((r) => r.kind === 'expressway')).toHaveLength(1);
    expect(map.blocks).toHaveLength(SPEC.blocksX * SPEC.blocksZ);
    expect(map.roads.some((r) => r.kind === 'avenue')).toBe(true);
  });

  it('keeps buildings inside their lots, off the roads', () => {
    for (const block of map.blocks) {
      for (const b of block.buildings) {
        expect(b.rect.x0).toBeGreaterThanOrEqual(block.lot.x0 - 1e-6);
        expect(b.rect.x1).toBeLessThanOrEqual(block.lot.x1 + 1e-6);
        expect(b.rect.z1).toBeLessThanOrEqual(block.lot.z1 + 1e-6);
        expect(b.heightM).toBeGreaterThan(0);
        const cx = (b.rect.x0 + b.rect.x1) / 2;
        const cz = (b.rect.z0 + b.rect.z1) / 2;
        expect(citySurfaceAt(map, cx, cz)).toBe('building');
      }
    }
  });

  it('downtown towers are taller than the suburbs', () => {
    const avg = (d: string) => {
      const hs = map.blocks
        .filter((b) => b.district === d)
        .flatMap((b) => b.buildings.map((x) => x.heightM));
      return hs.reduce((a, b) => a + b, 0) / hs.length;
    };
    expect(avg('downtown')).toBeGreaterThan(avg('residential') * 2);
  });

  it('classifies surfaces: road, sidewalk, sea and off-map', () => {
    const road = map.roads[1];
    if (!road) throw new Error('no road');
    expect(citySurfaceAt(map, road.centre, 50)).toBe('road');
    const block = map.blocks[0];
    if (!block) throw new Error('no block');
    expect(citySurfaceAt(map, block.rect.x0 + 1, block.rect.z0 + 30)).toBe('sidewalk');
    expect(isSolid(citySurfaceAt(map, 10, map.shoreZ + 5))).toBe(true);
    expect(isSolid(citySurfaceAt(map, -5, 100))).toBe(true);
    expect(blockAt(map, block.rect.x0 + 5, block.rect.z0 + 5)).toBe(block);
    expect(districtAt(map, block.rect.x0 + 5, block.rect.z0 + 5)).toBe(block.district);
  });

  it('finds the nearest road, in the right-hand lane, facing along it', () => {
    const block = map.blocks[7];
    if (!block) throw new Error('no block');
    const pose = nearestRoadPose(map, block.rect.x0 + 30, block.rect.z0 + 2, 0);
    expect(citySurfaceAt(map, pose.x, pose.z)).toBe('road');
    expect(pose.heading).toBe(0); // east
    expect(pose.z).toBeGreaterThan(pose.road.centre); // right of travel = south side
  });

  it('spawns on a road', () => {
    expect(citySurfaceAt(map, map.spawn.x, map.spawn.z)).toBe('road');
  });
});

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

  it('rides off along its heading and leans into a turn', () => {
    let r = createFreeRider(scooter, map);
    const start = { x: r.x, z: r.z, h: r.heading };
    for (let i = 0; i < 240 * 3; i++) {
      r = stepFreeRider(ctx(), r, { throttle: 1, brake: 0, clutchLever: 0 }, 0, false);
    }
    expect(r.sim.speedMps).toBeGreaterThan(8);
    // Spawned heading north: z goes down.
    expect(start.z - r.z).toBeGreaterThan(15);
    expect(Math.abs(r.x - start.x)).toBeLessThan(1);
    const before = r.heading;
    for (let i = 0; i < 120; i++) {
      r = stepFreeRider(ctx(), r, { throttle: 0.5, brake: 0, clutchLever: 0 }, 1, false);
    }
    expect(r.lean).toBeGreaterThan(0.2);
    expect(r.heading).toBeLessThan(before); // a left turn lowers the heading
  });

  it('crashes into a building and is put back on a road', () => {
    const block = map.blocks.find((b) => b.buildings.length > 0);
    const b = block?.buildings[0];
    if (!b) throw new Error('no building');
    let r = {
      ...createFreeRider(scooter, map),
      x: b.rect.x0 - 3,
      z: (b.rect.z0 + b.rect.z1) / 2,
      heading: 0,
      surface: 'sidewalk' as CitySurface,
      sim: { ...createFreeRider(scooter, map).sim, speedMps: 12 },
    };
    for (let i = 0; i < 120 && r.crashedUntilS === null; i++) {
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
});

describe('traffic', () => {
  const rider = map.spawn;

  it('places cars on roads, away from the rider', () => {
    const t = createTraffic(map, 20, 3, rider);
    expect(t.cars.length).toBeGreaterThan(10);
    for (const c of t.cars) {
      expect(citySurfaceAt(map, c.x, c.z)).toBe('road');
      expect(Math.hypot(c.x - rider.x, c.z - rider.z)).toBeGreaterThan(30);
    }
  });

  it('keeps cars on the roads as they drive and turn', () => {
    let t = createTraffic(map, 20, 3, rider);
    const start = t.cars.map((c) => ({ x: c.x, z: c.z }));
    for (let i = 0; i < 60 * 30; i++) t = stepTraffic(map, t, 1 / 60, null, i);
    let moved = 0;
    t.cars.forEach((c, i) => {
      expect(isSolid(citySurfaceAt(map, c.x, c.z))).toBe(false);
      if (Math.hypot(c.x - (start[i]?.x ?? 0), c.z - (start[i]?.z ?? 0)) > 50) moved++;
    });
    expect(moved).toBeGreaterThan(t.cars.length / 2);
  });

  it('a car stops for a rider standing in its lane', () => {
    const t = createTraffic(map, 1, 11, rider);
    const car = t.cars[0];
    if (!car) throw new Error('no car');
    const ahead = { x: car.x + Math.cos(car.heading) * 20, z: car.z + Math.sin(car.heading) * 20 };
    let state = t;
    for (let i = 0; i < 60 * 4; i++) state = stepTraffic(map, state, 1 / 60, ahead, i);
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

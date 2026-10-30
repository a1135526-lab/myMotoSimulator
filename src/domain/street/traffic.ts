import { seededRandom, type CityMap, type RoadEdge } from './city';
import {
  bezier,
  choices,
  CRUISE_MPS,
  curveLength,
  DRIVEN,
  edgeOf,
  entryS,
  exitS,
  lanePosPoint,
  reverse,
  turnControl,
  type LanePos,
  type Point,
  type Turn,
} from './trafficRoutes';

/**
 * City traffic on the real road network. Cars keep to the right (as in
 * Taiwan), respect one-way streets, cruise at the road's speed, slow for
 * turns, follow the car ahead and stop for a rider in front of them. At each
 * junction they pick a way on, preferring to carry straight on.
 */

export type CarKind = 'sedan' | 'hatch' | 'van' | 'bus';

export const CAR_SIZE: Readonly<Record<CarKind, { length: number; width: number }>> = {
  sedan: { length: 4.6, width: 1.8 },
  hatch: { length: 3.9, width: 1.7 },
  van: { length: 5.0, width: 2.0 },
  bus: { length: 11, width: 2.5 },
};

const ACCEL_MPS2 = 2.5;
const DECEL_MPS2 = 6;
const FOLLOW_GAP_M = 7;
const FOLLOW_LOOK_M = 18;
/** Gap a car leaves in front of a rider in its way, m. */
const STOP_FOR_RIDER_M = 9;
/** Start slowing for a turn this far before it. */
const SLOW_FOR_TURN_M = 30;
const MIN_TURN_MPS = 4;
/** Cars this far from the rider are put back near them (keeps the town busy where you are). */
const RECYCLE_M = 900;

export interface Car {
  readonly id: number;
  readonly kind: CarKind;
  /** 0–1, for paint colour. */
  readonly paint: number;
  readonly pos: LanePos;
  readonly turn: Turn | null;
  /** The way on at the next junction (decided once per edge). */
  readonly plan: { readonly next: LanePos | null; readonly speedMps: number } | null;
  readonly speedMps: number;
  readonly cruiseMps: number;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
}

export interface TrafficState {
  readonly cars: readonly Car[];
  readonly seed: number;
}

function placed(map: CityMap, car: Omit<Car, 'x' | 'z' | 'heading'>): Car {
  if (car.turn) {
    const { p0, p1, p2, t } = car.turn;
    const p = bezier(t, p0, p1, p2);
    const q = bezier(Math.min(1, t + 0.02), p0, p1, p2);
    const r = bezier(Math.max(0, t - 0.02), p0, p1, p2);
    return { ...car, x: p.x, z: p.z, heading: Math.atan2(q.z - r.z, q.x - r.x) };
  }
  const p = lanePosPoint(map, car.pos);
  return { ...car, x: p.x, z: p.z, heading: p.heading };
}

const KINDS: readonly CarKind[] = ['sedan', 'sedan', 'sedan', 'hatch', 'hatch', 'van', 'bus'];

/** A random spot on a road cars use, within `range` of a point. */
function randomLane(map: CityMap, rnd: () => number, near: Point, range: number): LanePos | null {
  for (let tries = 0; tries < 60; tries++) {
    const e = map.edges[Math.floor(rnd() * map.edges.length)] as RoadEdge;
    if (!DRIVEN.has(e.cls) || e.length < 30) continue;
    const mid = e.points[Math.floor(e.points.length / 2)] ?? e.points[0];
    if (!mid || Math.hypot(mid.x - near.x, mid.z - near.z) > range) continue;
    const forward = e.oneway || rnd() < 0.5;
    const lane = Math.floor(rnd() * e.lanesPerDirection);
    const pos = { edge: e.id, forward, lane, s: 0 };
    const lo = Math.min(entryS(map, e, e.a), exitS(map, { ...pos, forward: true }));
    const hi = Math.max(entryS(map, e, e.a), exitS(map, { ...pos, forward: true }));
    return { ...pos, s: lo + rnd() * (hi - lo) };
  }
  return null;
}

function newCar(map: CityMap, id: number, pos: LanePos, rnd: () => number): Car {
  const e = edgeOf(map, pos);
  const kind = KINDS[Math.floor(rnd() * KINDS.length)] ?? 'sedan';
  const cruise = CRUISE_MPS[e.cls] * (0.85 + rnd() * 0.3);
  return placed(map, {
    id,
    kind: kind === 'bus' && e.cls !== 'primary' && e.cls !== 'secondary' ? 'sedan' : kind,
    paint: rnd(),
    pos,
    turn: null,
    plan: null,
    speedMps: cruise * 0.8,
    cruiseMps: cruise,
  });
}

export function createTraffic(
  map: CityMap,
  count: number,
  seed: number,
  avoid: Point,
): TrafficState {
  const rnd = seededRandom(seed);
  const cars: Car[] = [];
  let tries = 0;
  while (cars.length < count && tries++ < count * 30) {
    const pos = randomLane(map, rnd, avoid, RECYCLE_M * 0.8);
    if (!pos) continue;
    const car = newCar(map, cars.length, pos, rnd);
    const crowded = cars.some((c) => Math.hypot(c.x - car.x, c.z - car.z) < 14);
    if (crowded || Math.hypot(car.x - avoid.x, car.z - avoid.z) < 40) continue;
    cars.push(car);
  }
  return { cars, seed };
}

/** Distance ahead of `car` to a point, and how far off its line it is. */
function relative(car: Car, x: number, z: number) {
  const fx = Math.cos(car.heading);
  const fz = Math.sin(car.heading);
  const dx = x - car.x;
  const dz = z - car.z;
  return { ahead: dx * fx + dz * fz, side: -dx * fz + dz * fx };
}

function targetSpeed(map: CityMap, car: Car, cars: readonly Car[], rider: Point | null): number {
  let target = car.turn ? car.turn.speedMps : car.cruiseMps;
  if (!car.turn && car.plan) {
    const gap = Math.abs(exitS(map, car.pos) - car.pos.s);
    const v = car.plan.speedMps;
    if (gap < SLOW_FOR_TURN_M)
      target = Math.min(target, v + (gap / SLOW_FOR_TURN_M) * (target - v));
  }
  const halfLen = CAR_SIZE[car.kind].length / 2;
  for (const other of cars) {
    if (other.id === car.id) continue;
    const r = relative(car, other.x, other.z);
    if (r.ahead <= 0 || r.ahead > FOLLOW_LOOK_M + halfLen || Math.abs(r.side) > 1.6) continue;
    const gap = r.ahead - halfLen - CAR_SIZE[other.kind].length / 2;
    target = Math.min(target, gap < FOLLOW_GAP_M ? 0 : other.speedMps);
  }
  if (rider) {
    // Look far enough ahead to stop from the current speed, plus a margin.
    const look = (car.speedMps * car.speedMps) / (2 * DECEL_MPS2) + STOP_FOR_RIDER_M;
    const r = relative(car, rider.x, rider.z);
    if (r.ahead > 0 && r.ahead < look + halfLen && Math.abs(r.side) < 1.8) target = 0;
  }
  return target;
}

/** Pick the way on at the next junction: mostly straight, sometimes a turn. */
function plan(map: CityMap, car: Car, rnd: () => number): NonNullable<Car['plan']> {
  const options = choices(map, car.pos);
  if (options.length === 0) return { next: reverse(map, car.pos), speedMps: MIN_TURN_MPS };
  const weights = options.map((o) => Math.cos(o.turn) + 1.3);
  let r = rnd() * weights.reduce((a, b) => a + b, 0);
  const pick = options.find((_, i) => (r -= weights[i] ?? 0) <= 0) ?? options[0];
  const straightness = Math.max(0, Math.cos(pick?.turn ?? 0));
  return {
    next: pick?.pos ?? null,
    speedMps: MIN_TURN_MPS + (car.cruiseMps - MIN_TURN_MPS) * straightness ** 2,
  };
}

function advance(
  map: CityMap,
  car: Car,
  speed: number,
  dt: number,
  rnd: () => number,
  near: Point,
): Car {
  const ds = speed * dt;
  if (car.turn) {
    const t = car.turn.t + ds / car.turn.lengthM;
    if (t < 1) return placed(map, { ...car, speedMps: speed, turn: { ...car.turn, t } });
    const e = edgeOf(map, car.turn.next);
    return placed(map, {
      ...car,
      speedMps: speed,
      pos: car.turn.next,
      turn: null,
      plan: null,
      cruiseMps: CRUISE_MPS[e.cls] * (0.85 + rnd() * 0.3),
    });
  }
  const route = car.plan ?? plan(map, car, rnd);
  const exit = exitS(map, car.pos);
  const s = car.pos.s + (car.pos.forward ? ds : -ds);
  const reached = car.pos.forward ? s >= exit : s <= exit;
  if (!reached)
    return placed(map, { ...car, speedMps: speed, pos: { ...car.pos, s }, plan: route });
  if (!route.next) {
    // One-way dead end: tow it somewhere near the rider.
    const pos = randomLane(map, rnd, near, RECYCLE_M * 0.8);
    return pos ? newCar(map, car.id, pos, rnd) : { ...car, speedMps: 0 };
  }
  const p0 = lanePosPoint(map, { ...car.pos, s: exit });
  const p2 = lanePosPoint(map, route.next);
  const p1 = turnControl(p0, p2);
  const lengthM = Math.max(1, curveLength(p0, p1, p2));
  return placed(map, {
    ...car,
    speedMps: speed,
    pos: { ...car.pos, s: exit },
    turn: { p0, p1, p2, t: 0, lengthM, next: route.next, speedMps: route.speedMps },
    plan: route,
  });
}

export function stepTraffic(
  map: CityMap,
  traffic: TrafficState,
  dt: number,
  rider: Point | null,
  stepIndex: number,
  near: Point = rider ?? { x: 0, z: 0 },
): TrafficState {
  const rnd = seededRandom(traffic.seed + stepIndex);
  const cars = traffic.cars.map((car) => {
    if (Math.hypot(car.x - near.x, car.z - near.z) > RECYCLE_M) {
      const pos = randomLane(map, rnd, near, RECYCLE_M * 0.8);
      const fresh = pos && newCar(map, car.id, pos, rnd);
      if (fresh && Math.hypot(fresh.x - near.x, fresh.z - near.z) > 120) return fresh;
    }
    const target = targetSpeed(map, car, traffic.cars, rider);
    const dv = target - car.speedMps;
    const speed = Math.max(
      0,
      car.speedMps + Math.max(-DECEL_MPS2 * dt, Math.min(ACCEL_MPS2 * dt, dv)),
    );
    return advance(map, car, speed, dt, rnd, near);
  });
  return { ...traffic, cars };
}

/** Does a rider at (x, z) overlap any car (with a little body margin)? */
export function hitCar(traffic: TrafficState, x: number, z: number, marginM = 0.45): Car | null {
  for (const car of traffic.cars) {
    const r = relative(car, x, z);
    const s = CAR_SIZE[car.kind];
    if (Math.abs(r.ahead) < s.length / 2 + marginM && Math.abs(r.side) < s.width / 2 + marginM)
      return car;
  }
  return null;
}

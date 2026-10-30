import { seededRandom, type CityMap, type Road } from './city';
import {
  bezier,
  choices,
  curveLength,
  lanePoint,
  nextCrossing,
  type LanePos,
  type Point,
  type Turn,
} from './trafficRoutes';

/**
 * City traffic. Cars keep to the right (as in Taiwan), cruise at the road's
 * speed, slow for turns, follow the car ahead and stop for a rider in front
 * of them. At each crossing they go straight or turn, picked at random from
 * the ways that exist; turns follow a quadratic curve through the junction.
 */

export type CarKind = 'sedan' | 'hatch' | 'van' | 'bus';

export const CAR_SIZE: Readonly<Record<CarKind, { length: number; width: number }>> = {
  sedan: { length: 4.6, width: 1.8 },
  hatch: { length: 3.9, width: 1.7 },
  van: { length: 5.0, width: 2.0 },
  bus: { length: 11, width: 2.5 },
};

const CRUISE_MPS: Readonly<Record<Road['kind'], number>> = {
  street: 11,
  avenue: 14,
  expressway: 22,
};
const TURN_MPS = 6;
const SLOW_FOR_TURN_M = 30;
const ACCEL_MPS2 = 2.5;
const DECEL_MPS2 = 6;
const FOLLOW_GAP_M = 7;
const FOLLOW_LOOK_M = 18;
/** Gap a car leaves in front of a rider in its way, m. */
const STOP_FOR_RIDER_M = 9;

export interface Car {
  readonly id: number;
  readonly kind: CarKind;
  /** 0–1, for paint colour. */
  readonly paint: number;
  readonly pos: LanePos;
  readonly turn: Turn | null;
  /** Where the car will turn next (decided once per junction). */
  readonly plan: { readonly crossing: number; readonly next: LanePos | null } | null;
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
  const p = lanePoint(map, car.pos);
  return { ...car, x: p.x, z: p.z, heading: p.heading };
}

const KINDS: readonly CarKind[] = ['sedan', 'sedan', 'sedan', 'hatch', 'hatch', 'van', 'bus'];

export function createTraffic(
  map: CityMap,
  count: number,
  seed: number,
  avoid: Point,
): TrafficState {
  const rnd = seededRandom(seed);
  const cars: Car[] = [];
  let tries = 0;
  while (cars.length < count && tries++ < count * 20) {
    const road = map.roads[Math.floor(rnd() * map.roads.length)] as Road;
    const dir = rnd() < 0.5 ? 1 : -1;
    const lane = Math.floor(rnd() * road.lanesPerDirection);
    const along = road.from + 15 + rnd() * (road.to - road.from - 30);
    const kind = KINDS[Math.floor(rnd() * KINDS.length)] ?? 'sedan';
    const car = placed(map, {
      id: cars.length,
      kind: kind === 'bus' && road.kind === 'street' ? 'sedan' : kind,
      paint: rnd(),
      pos: { road: road.id, dir, lane, along },
      turn: null,
      plan: null,
      speedMps: CRUISE_MPS[road.kind] * 0.8,
      cruiseMps: CRUISE_MPS[road.kind] * (0.85 + rnd() * 0.3),
    });
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
  const road = map.roads[car.pos.road] as Road;
  let target = car.turn ? TURN_MPS : car.cruiseMps;
  if (!car.turn && car.plan?.next) {
    const gap = Math.abs(car.plan.crossing - car.pos.along);
    if (gap < SLOW_FOR_TURN_M)
      target = Math.min(target, TURN_MPS + (gap / SLOW_FOR_TURN_M) * (target - TURN_MPS));
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
  return Math.min(target, CRUISE_MPS[road.kind] * 1.2);
}

function advance(map: CityMap, car: Car, speed: number, dt: number, rnd: () => number): Car {
  const ds = speed * dt;
  if (car.turn) {
    const t = car.turn.t + ds / car.turn.lengthM;
    if (t < 1) return placed(map, { ...car, speedMps: speed, turn: { ...car.turn, t } });
    const road = map.roads[car.turn.next.road] as Road;
    return placed(map, {
      ...car,
      speedMps: speed,
      pos: car.turn.next,
      turn: null,
      plan: null,
      cruiseMps: CRUISE_MPS[road.kind] * (0.85 + rnd() * 0.3),
    });
  }

  let plan = car.plan;
  if (!plan) {
    const cross = nextCrossing(map, car.pos);
    if (cross) {
      const options = choices(map, car.pos, cross);
      const pick = options[Math.floor(rnd() * options.length)];
      plan = { crossing: cross.at, next: pick === undefined ? reverse(map, car.pos) : pick };
    } else {
      plan = { crossing: car.pos.dir > 0 ? Infinity : -Infinity, next: reverse(map, car.pos) };
    }
  }

  const along = car.pos.along + car.pos.dir * ds;
  const road = map.roads[car.pos.road] as Road;
  const end = car.pos.dir > 0 ? road.to - 2 : road.from + 2;
  const pastEnd = car.pos.dir > 0 ? along >= end : along <= end;
  if (pastEnd) {
    // Dead end: turn round into the other carriageway.
    return placed(map, {
      ...car,
      speedMps: 0,
      pos: reverse(map, { ...car.pos, along: end }),
      plan: null,
    });
  }

  const cross = plan.crossing;
  const crossRoad = map.roads.find((r) => r.axis !== road.axis && r.centre === cross);
  const entry = cross - car.pos.dir * ((crossRoad?.widthM ?? 0) / 2 + 0.5);
  const reached = car.pos.dir > 0 ? along >= entry : along <= entry;
  if (reached && plan.next) {
    const p0 = lanePoint(map, { ...car.pos, along: entry });
    const p2 = lanePoint(map, plan.next);
    const p1 = road.axis === 'x' ? { x: p2.x, z: p0.z } : { x: p0.x, z: p2.z };
    return placed(map, {
      ...car,
      speedMps: speed,
      pos: { ...car.pos, along: entry },
      turn: { p0, p1, p2, t: 0, lengthM: Math.max(1, curveLength(p0, p1, p2)), next: plan.next },
      plan,
    });
  }
  const passed = car.pos.dir > 0 ? along > cross : along < cross;
  return placed(map, {
    ...car,
    speedMps: speed,
    pos: { ...car.pos, along },
    plan: passed ? null : plan,
  });
}

function reverse(map: CityMap, p: LanePos): LanePos {
  const road = map.roads[p.road] as Road;
  return { ...p, dir: p.dir > 0 ? -1 : 1, lane: Math.min(p.lane, road.lanesPerDirection - 1) };
}

export function stepTraffic(
  map: CityMap,
  traffic: TrafficState,
  dt: number,
  rider: Point | null,
  stepIndex: number,
): TrafficState {
  const rnd = seededRandom(traffic.seed + stepIndex);
  const cars = traffic.cars.map((car) => {
    const target = targetSpeed(map, car, traffic.cars, rider);
    const dv = target - car.speedMps;
    const speed = Math.max(
      0,
      car.speedMps + Math.max(-DECEL_MPS2 * dt, Math.min(ACCEL_MPS2 * dt, dv)),
    );
    return advance(map, car, speed, dt, rnd);
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

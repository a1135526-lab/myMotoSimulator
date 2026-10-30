import type { CityMap, Road } from './city';

/** Lane geometry for traffic: where a lane is, what comes next, and turn curves. */

export interface Point {
  readonly x: number;
  readonly z: number;
}

export interface LanePos {
  readonly road: number;
  readonly dir: 1 | -1;
  readonly lane: number;
  readonly along: number;
}

export interface Turn {
  readonly p0: Point;
  readonly p1: Point;
  readonly p2: Point;
  readonly t: number;
  readonly lengthM: number;
  readonly next: LanePos;
}

export const headingOf = (road: Road, dir: 1 | -1) =>
  road.axis === 'x' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2;

export const laneOffset = (road: Road, lane: number) =>
  (road.widthM / 2 / road.lanesPerDirection) * (lane + 0.5);

/** World position of a lane position: right of the centreline in the direction of travel. */
export function lanePoint(map: CityMap, p: LanePos): Point & { heading: number } {
  const road = map.roads[p.road] as Road;
  const h = headingOf(road, p.dir);
  const off = laneOffset(road, p.lane);
  const cx = road.axis === 'x' ? p.along : road.centre;
  const cz = road.axis === 'x' ? road.centre : p.along;
  return { x: cx - Math.sin(h) * off, z: cz + Math.cos(h) * off, heading: h };
}

/** Roads crossing `road`, by where they cross it. */
export function crossings(map: CityMap, road: Road): { at: number; road: Road }[] {
  return map.roads
    .filter((r) => r.axis !== road.axis && road.centre >= r.from - 1 && road.centre <= r.to + 1)
    .map((r) => ({ at: r.centre, road: r }))
    .filter((c) => c.at >= road.from - 1 && c.at <= road.to + 1)
    .sort((a, b) => a.at - b.at);
}

export function nextCrossing(map: CityMap, p: LanePos) {
  const road = map.roads[p.road] as Road;
  const list = crossings(map, road);
  const ahead =
    p.dir > 0 ? list.filter((c) => c.at > p.along) : list.filter((c) => c.at < p.along).reverse();
  return ahead[0] ?? null;
}

/** Options at a junction: straight on, or onto the crossing road either way it goes. */
export function choices(
  map: CityMap,
  p: LanePos,
  cross: { at: number; road: Road },
): (LanePos | null)[] {
  const road = map.roads[p.road] as Road;
  const out: (LanePos | null)[] = [];
  const beyond = p.dir > 0 ? road.to - cross.at : cross.at - road.from;
  if (beyond > cross.road.widthM) out.push(null); // straight on
  const c = cross.road;
  for (const dir of [1, -1] as const) {
    const room = dir > 0 ? c.to - road.centre : road.centre - c.from;
    if (room <= road.widthM) continue;
    out.push({
      road: c.id,
      dir,
      lane: Math.min(p.lane, c.lanesPerDirection - 1),
      along: road.centre + dir * (road.widthM / 2 + 0.5),
    });
  }
  return out;
}

export function bezier(t: number, a: Point, b: Point, c: Point): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    z: u * u * a.z + 2 * u * t * b.z + t * t * c.z,
  };
}

export function curveLength(a: Point, b: Point, c: Point): number {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= 8; i++) {
    const p = bezier(i / 8, a, b, c);
    len += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return len;
}

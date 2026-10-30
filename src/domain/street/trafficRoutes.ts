import type { CityMap, RoadClass, RoadEdge } from './city';
import { wrapAngle } from './geometry2d';
import { lanePoint, type EdgePoint } from './roadNetwork';

/** Lane positions on the road graph for traffic, what comes next at a junction, and turn curves. */

export interface Point {
  readonly x: number;
  readonly z: number;
}

export interface LanePos {
  readonly edge: number;
  /** Travelling a → b. */
  readonly forward: boolean;
  readonly lane: number;
  /** Distance from node a along the edge. */
  readonly s: number;
}

export interface Turn {
  readonly p0: Point;
  readonly p1: Point;
  readonly p2: Point;
  readonly t: number;
  readonly lengthM: number;
  readonly next: LanePos;
  /** Speed to take it at, m/s. */
  readonly speedMps: number;
}

/** Roads cars use (lanes and alleys are left to scooters). */
export const DRIVEN: ReadonlySet<RoadClass> = new Set([
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'link',
]);

export const CRUISE_MPS: Readonly<Record<RoadClass, number>> = {
  primary: 14,
  secondary: 13,
  tertiary: 11,
  unclassified: 9,
  residential: 7,
  living_street: 5,
  link: 9,
};

export const edgeOf = (map: CityMap, p: LanePos) => map.edges[p.edge] as RoadEdge;

export const lanePosPoint = (map: CityMap, p: LanePos): EdgePoint =>
  lanePoint(edgeOf(map, p), p.s, p.forward, p.lane);

const radiusAt = (map: CityMap, node: number) => (map.nodes[node]?.radius ?? 0) + 1;

/** Where a car in this lane stops following the edge and starts its turn. */
export function exitS(map: CityMap, p: LanePos): number {
  const e = edgeOf(map, p);
  const s = p.forward ? e.length - radiusAt(map, e.b) : radiusAt(map, e.a);
  return Math.max(0, Math.min(e.length, s));
}

/** Where a car joining an edge at `node` starts on it. */
export function entryS(map: CityMap, edge: RoadEdge, node: number): number {
  const s = edge.a === node ? radiusAt(map, node) : edge.length - radiusAt(map, node);
  return Math.max(0, Math.min(edge.length, s));
}

/** Ways on from the junction ahead, with how sharply each turns (rad, − = left). */
export function choices(map: CityMap, p: LanePos): { pos: LanePos; turn: number }[] {
  const e = edgeOf(map, p);
  const node = p.forward ? e.b : e.a;
  const inHeading = lanePosPoint(map, { ...p, s: exitS(map, p) }).heading;
  const out: { pos: LanePos; turn: number }[] = [];
  for (const id of map.nodes[node]?.edges ?? []) {
    const next = map.edges[id] as RoadEdge;
    if (id === e.id || !DRIVEN.has(next.cls) || next.a === next.b) continue;
    const forward = next.a === node;
    if (!forward && next.oneway) continue;
    const pos: LanePos = {
      edge: id,
      forward,
      lane: Math.min(p.lane, next.lanesPerDirection - 1),
      s: entryS(map, next, node),
    };
    const turn = wrapAngle(lanePosPoint(map, pos).heading - inHeading);
    if (Math.abs(turn) < 2.7) out.push({ pos, turn });
  }
  return out;
}

/** Turn back on the same road (dead ends). Null on a one-way street. */
export function reverse(map: CityMap, p: LanePos): LanePos | null {
  const e = edgeOf(map, p);
  if (e.oneway) return null;
  return { ...p, forward: !p.forward, lane: Math.min(p.lane, e.lanesPerDirection - 1) };
}

export const nodeAhead = (map: CityMap, p: LanePos) => {
  const e = edgeOf(map, p);
  return p.forward ? e.b : e.a;
};

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

/** Control point for a turn: where the two lane lines cross (or halfway, if they don't). */
export function turnControl(p0: EdgePoint, p2: EdgePoint): Point {
  const d0 = { x: Math.cos(p0.heading), z: Math.sin(p0.heading) };
  const d2 = { x: Math.cos(p2.heading), z: Math.sin(p2.heading) };
  const det = d0.x * -d2.z - d0.z * -d2.x;
  const mid = { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 };
  if (Math.abs(det) < 1e-3) return mid;
  const rx = p2.x - p0.x;
  const rz = p2.z - p0.z;
  const t = (rx * -d2.z - rz * -d2.x) / det;
  const gap = Math.hypot(rx, rz);
  if (t <= 0 || t > gap * 2) return mid;
  return { x: p0.x + d0.x * t, z: p0.z + d0.z * t };
}

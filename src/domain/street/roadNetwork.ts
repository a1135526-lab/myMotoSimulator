import { ROAD_CLASSES, type CityData, type RoadClass, type RoadEdge, type RoadNode } from './city';
import { pointsOf, type Vec2 } from './geometry2d';

/** The road graph from imported data, and positions along its edges. */

const LANE_M = 3.2;

/** Carriageway width by class and lane count, m (Taiwanese streets: lanes are narrow). */
function widthFor(cls: RoadClass, lanes: number): number {
  switch (cls) {
    case 'primary':
    case 'secondary':
      return Math.max(10, lanes * LANE_M + 2);
    case 'tertiary':
      return Math.max(7, lanes * LANE_M + 1);
    case 'unclassified':
      return Math.max(6.5, lanes * 3 + 0.5);
    case 'residential':
      return lanes > 2 ? lanes * 3 : 5.5;
    case 'living_street':
      return 4.5;
    case 'link':
      return Math.max(5, lanes * 3.5 + 1);
  }
}

export const SIDEWALK_M: Readonly<Record<RoadClass, number>> = {
  primary: 3.5,
  secondary: 3,
  tertiary: 2.2,
  unclassified: 1.5,
  residential: 0.8,
  living_street: 0.6,
  link: 1,
};

function cumulative(points: readonly Vec2[]): number[] {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1] as Vec2;
    const q = points[i] as Vec2;
    cum.push((cum[i - 1] ?? 0) + Math.hypot(q.x - p.x, q.z - p.z));
  }
  return cum;
}

export function buildRoads(data: CityData): { nodes: RoadNode[]; edges: RoadEdge[] } {
  const at = (i: number): Vec2 => ({ x: data.nodes[i * 2] ?? 0, z: data.nodes[i * 2 + 1] ?? 0 });
  const edges: RoadEdge[] = data.edges.map((e, id) => {
    const [a0 = 0, b0 = 0, name = -1, clsIdx = 0, lanes = 2, oneway = 0] = e;
    const inner = pointsOf(e, 6);
    let points = [at(a0), ...inner, at(b0)];
    let [a, b] = [a0, b0];
    if (oneway < 0) {
      points = points.reverse();
      [a, b] = [b0, a0];
    }
    const cls = ROAD_CLASSES[clsIdx] ?? 'residential';
    const cum = cumulative(points);
    return {
      id,
      a,
      b,
      name: data.names[name] ?? null,
      cls,
      lanes,
      oneway: oneway !== 0,
      lanesPerDirection: oneway !== 0 ? lanes : Math.max(1, Math.floor(lanes / 2)),
      widthM: widthFor(cls, lanes),
      sidewalkM: SIDEWALK_M[cls],
      points,
      cum,
      length: cum[cum.length - 1] ?? 0,
    };
  });

  const incident: number[][] = Array.from({ length: data.nodes.length / 2 }, () => []);
  for (const e of edges) {
    incident[e.a]?.push(e.id);
    if (e.b !== e.a) incident[e.b]?.push(e.id);
  }
  const signals = new Set(data.signals);
  const nodes: RoadNode[] = incident.map((list, id) => {
    const p = at(id);
    const widest = Math.max(0, ...list.map((i) => (edges[i] as RoadEdge).widthM / 2));
    return {
      id,
      x: p.x,
      z: p.z,
      edges: list,
      signal: signals.has(id),
      radius: list.length >= 3 ? Math.min(14, widest + 1.5) : 0,
    };
  });
  return { nodes, edges };
}

export interface EdgePoint {
  readonly x: number;
  readonly z: number;
  /** Heading of travel a → b at this point. */
  readonly heading: number;
}

/** Position and direction s metres from a along an edge (clamped to the edge). */
export function pointAlong(edge: RoadEdge, s: number): EdgePoint {
  const pts = edge.points;
  const d = Math.max(0, Math.min(edge.length, s));
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((edge.cum[mid] ?? 0) <= d) lo = mid;
    else hi = mid;
  }
  const p = pts[lo] as Vec2;
  const q = pts[hi] as Vec2;
  const seg = (edge.cum[hi] ?? 0) - (edge.cum[lo] ?? 0);
  const t = seg > 0 ? (d - (edge.cum[lo] ?? 0)) / seg : 0;
  return {
    x: p.x + (q.x - p.x) * t,
    z: p.z + (q.z - p.z) * t,
    heading: Math.atan2(q.z - p.z, q.x - p.x),
  };
}

/** Distance right of the centreline of lane `lane` (0 = nearest the middle). */
export function laneOffset(edge: RoadEdge, lane: number): number {
  const lanes = edge.lanesPerDirection;
  if (edge.oneway) {
    const w = edge.widthM / lanes;
    return edge.widthM / 2 - w * (lanes - Math.min(lane, lanes - 1) - 0.5);
  }
  return (edge.widthM / 2 / lanes) * (Math.min(lane, lanes - 1) + 0.5);
}

/**
 * A point in a lane: `s` from a, travelling forward (a → b) or back, offset
 * to the right of travel (Taiwan drives on the right).
 */
export function lanePoint(edge: RoadEdge, s: number, forward: boolean, lane: number): EdgePoint {
  const c = pointAlong(edge, s);
  const heading = forward ? c.heading : c.heading + Math.PI;
  const off = laneOffset(edge, lane);
  // Right of travel is (−sin h, cos h).
  return {
    x: c.x - Math.sin(heading) * off,
    z: c.z + Math.cos(heading) * off,
    heading: Math.atan2(Math.sin(heading), Math.cos(heading)),
  };
}

/** The node at the other end of an edge. */
export const otherEnd = (edge: RoadEdge, node: number) => (edge.a === node ? edge.b : edge.a);

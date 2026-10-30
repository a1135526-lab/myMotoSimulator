import type { CityMap, RoadEdge } from './city';
import { wrapAngle } from './geometry2d';
import { pointAlong } from './roadNetwork';
import type { RouteLeg } from './routing';

/** Turn-by-turn instructions for a route: what to do at each junction it passes. */

export type ManeuverKind =
  'straight' | 'slight-left' | 'left' | 'slight-right' | 'right' | 'uturn' | 'arrive';

export interface Maneuver {
  readonly kind: ManeuverKind;
  /** Distance along the route where it happens, m. */
  readonly atM: number;
  readonly x: number;
  readonly z: number;
  /** Road you're on after it (null when unnamed). */
  readonly road: string | null;
}

const DEG = Math.PI / 180;
/** Under this a change of direction is just the road bending. */
const STRAIGHT_RAD = 25 * DEG;
const SLIGHT_RAD = 60 * DEG;
const UTURN_RAD = 150 * DEG;

/**
 * Kind of turn from the change in heading. A left turn lowers the heading
 * (forward = (cos h, sin h) with z south), so a negative change is left.
 */
export function turnKind(deltaRad: number): ManeuverKind {
  const a = Math.abs(deltaRad);
  if (a < STRAIGHT_RAD) return 'straight';
  if (a >= UTURN_RAD) return 'uturn';
  const left = deltaRad < 0;
  if (a < SLIGHT_RAD) return left ? 'slight-left' : 'slight-right';
  return left ? 'left' : 'right';
}

/** Heading of travel at a distance along a leg, looking `probe` m ahead/behind. */
function travelHeading(edge: RoadEdge, leg: RouteLeg, atEnd: boolean): number {
  const probe = Math.min(8, Math.abs(leg.to - leg.from) / 2);
  const dir = leg.forward ? 1 : -1;
  const s = atEnd ? leg.to - dir * probe : leg.from;
  const p = pointAlong(edge, s);
  const q = pointAlong(edge, s + dir * Math.max(0.5, probe));
  return Math.atan2(q.z - p.z, q.x - p.x);
}

export function maneuversFor(map: CityMap, legs: readonly RouteLeg[], lengthM: number) {
  const out: Maneuver[] = [];
  let at = 0;
  for (let i = 0; i + 1 < legs.length; i++) {
    const leg = legs[i] as RouteLeg;
    const next = legs[i + 1] as RouteLeg;
    at += Math.abs(leg.to - leg.from);
    const a = map.edges[leg.edge] as RoadEdge;
    const b = map.edges[next.edge] as RoadEdge;
    const nodeId = leg.forward ? a.b : a.a;
    const node = map.nodes[nodeId];
    if (!node) continue;
    const kind = turnKind(wrapAngle(travelHeading(b, next, false) - travelHeading(a, leg, true)));
    const renamed = b.name !== null && b.name !== a.name;
    // A junction you ride straight through on the same road needs no instruction.
    if (kind === 'straight' && (!renamed || node.edges.length < 3)) continue;
    if (kind !== 'straight' && node.edges.length < 3 && !renamed && kind !== 'uturn') continue;
    out.push({ kind, atM: at, x: node.x, z: node.z, road: b.name });
  }
  const last = legs[legs.length - 1];
  const end = last ? pointAlong(map.edges[last.edge] as RoadEdge, last.to) : { x: 0, z: 0 };
  out.push({ kind: 'arrive', atM: lengthM, x: end.x, z: end.z, road: null });
  return out;
}

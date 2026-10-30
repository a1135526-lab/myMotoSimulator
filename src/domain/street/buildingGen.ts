import {
  seededRandom,
  type AreaKind,
  type Building,
  type BuildingStyle,
  type CityMap,
  type RoadClass,
  type RoadEdge,
} from './city';
import { areaAt } from './cityQueries';
import { boundsOf, closestOnSegment, convexOverlap, insidePolygon, type Vec2 } from './geometry2d';
import { pointAlong } from './roadNetwork';
import { cellsIn, gather, SEG_STRIDE } from './spatialIndex';

/**
 * Fill the street fronts the map leaves empty with buildings in the local
 * style: rows of 3–5 storey 透天 on lanes, taller shop-houses on main roads,
 * the odd tower where it's commercial, low wide sheds in industrial zones.
 * Each lot is a rectangle set back behind the sidewalk, checked against
 * every road, building and open space near it.
 */

interface LotRule {
  readonly frontage: readonly [number, number];
  readonly depth: readonly [number, number];
  readonly floors: readonly [number, number];
  readonly style: BuildingStyle;
}

const STOREY_M = 3.3;
const GAP_M = 0.4;
const MIN_DEPTH_M = 5;
const SKIP_M = 5;
/** Never build on these. */
const OPEN: ReadonlySet<AreaKind> = new Set([
  'park',
  'water',
  'school',
  'pitch',
  'cemetery',
  'farmland',
  'military',
]);

function ruleFor(zone: AreaKind | null, cls: RoadClass): LotRule {
  if (zone === 'industrial')
    return { frontage: [22, 48], depth: [18, 36], floors: [1, 3], style: 'factory' };
  if (zone === 'commercial')
    return { frontage: [12, 26], depth: [14, 22], floors: [5, 14], style: 'shophouse' };
  switch (cls) {
    case 'primary':
    case 'secondary':
      return { frontage: [10, 22], depth: [12, 18], floors: [4, 11], style: 'shophouse' };
    case 'tertiary':
      return { frontage: [9, 20], depth: [10, 16], floors: [3, 7], style: 'shophouse' };
    default:
      return { frontage: [8, 24], depth: [9, 14], floors: [3, 5], style: 'townhouse' };
  }
}

const between = (r: () => number, [lo, hi]: readonly [number, number]) => lo + r() * (hi - lo);

/** Is any point of the lot on a road or its sidewalk? */
function onRoad(map: CityMap, pts: readonly Vec2[]): boolean {
  const box = boundsOf(pts, 1);
  const keys = gather(map.index, box, (c) => c.segs);
  for (const key of keys) {
    const e = map.edges[Math.floor(key / SEG_STRIDE)] as RoadEdge;
    const i = key % SEG_STRIDE;
    const p = e.points[i] as Vec2;
    const q = e.points[i + 1] as Vec2;
    const clear = e.widthM / 2 + e.sidewalkM + 0.2;
    for (const v of pts) if (closestOnSegment(v.x, v.z, p.x, p.z, q.x, q.z).d < clear) return true;
  }
  return false;
}

function clashes(map: CityMap, ring: readonly Vec2[]): boolean {
  const box = boundsOf(ring);
  for (const i of gather(map.index, box, (c) => c.buildings)) {
    const b = map.buildings[i] as Building;
    if (b.bounds.maxX < box.minX || b.bounds.minX > box.maxX) continue;
    if (b.bounds.maxZ < box.minZ || b.bounds.minZ > box.maxZ) continue;
    if (convexOverlap(ring, b.ring)) return true;
  }
  return false;
}

/** Rectangle behind the front line: a lot `w` wide and `d` deep. */
function lot(c: Vec2, t: Vec2, n: Vec2, w: number, d: number): Vec2[] {
  const h = w / 2;
  return [
    { x: c.x - t.x * h, z: c.z - t.z * h },
    { x: c.x + t.x * h, z: c.z + t.z * h },
    { x: c.x + t.x * h + n.x * d, z: c.z + t.z * h + n.z * d },
    { x: c.x - t.x * h + n.x * d, z: c.z - t.z * h + n.z * d },
  ];
}

function samples(ring: readonly Vec2[]): Vec2[] {
  const out = [...ring];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as Vec2;
    const q = ring[(i + 1) % ring.length] as Vec2;
    out.push({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 });
  }
  const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length;
  const cz = ring.reduce((s, p) => s + p.z, 0) / ring.length;
  out.push({ x: cx, z: cz });
  return out;
}

function frontage(map: CityMap, out: Building[], edge: RoadEdge, side: 1 | -1, rnd: () => number) {
  const startNode = map.nodes[edge.a];
  const endNode = map.nodes[edge.b];
  let s = (startNode?.radius ?? 0) + 2;
  const end = edge.length - (endNode?.radius ?? 0) - 2;
  const offset = edge.widthM / 2 + edge.sidewalkM + 0.4;
  while (s < end - 4) {
    const mid = pointAlong(edge, s + 6);
    const zone = areaAt(map, mid.x, mid.z);
    if (zone && OPEN.has(zone)) {
      s += SKIP_M * 2;
      continue;
    }
    const rule = ruleFor(zone, edge.cls);
    const w = Math.min(between(rnd, rule.frontage), end - s);
    if (w < 6) break;
    const p = pointAlong(edge, s + w / 2);
    const t = { x: Math.cos(p.heading), z: Math.sin(p.heading) };
    // Right of a → b is (−sin h, cos h).
    const n = { x: -t.z * side, z: t.x * side };
    const c = { x: p.x + n.x * offset, z: p.z + n.z * offset };
    let placed: Vec2[] | null = null;
    for (let d = between(rnd, rule.depth); d >= MIN_DEPTH_M; d *= 0.65) {
      // Wind the ring the same way on both sides of the road.
      const ring = side > 0 ? lot(c, t, n, w - GAP_M, d) : lot(c, t, n, w - GAP_M, d).reverse();
      const pts = samples(ring);
      if (pts.some((v) => OPEN.has(areaAt(map, v.x, v.z) ?? 'residential'))) continue;
      if (onRoad(map, pts) || clashes(map, ring)) continue;
      placed = ring;
      break;
    }
    if (!placed) {
      s += SKIP_M;
      continue;
    }
    const floors = Math.round(between(rnd, rule.floors));
    const building: Building = {
      ring: placed,
      heightM: floors * STOREY_M + 0.6,
      style: rule.style === 'shophouse' && floors >= 8 ? 'tower' : rule.style,
      look: rnd(),
      // lot() starts with the street front; reversed rings end with it.
      front: side > 0 ? 0 : 2,
      bounds: boundsOf(placed),
    };
    const id = out.length;
    out.push(building);
    cellsIn(map.index, building.bounds, true, (cell) => cell.buildings.push(id));
    s += w;
  }
}

/** Adds generated buildings to `out` (which must be `map.buildings`). */
export function generateBuildings(map: CityMap, out: Building[], seed: number): void {
  const rnd = seededRandom(seed);
  for (const edge of map.edges) {
    if (edge.cls === 'link' || edge.length < 14) continue;
    frontage(map, out, edge, 1, rnd);
    frontage(map, out, edge, -1, rnd);
  }
}

/** True if (x, z) is inside any building (for tests and debugging). */
export const insideAnyBuilding = (map: CityMap, x: number, z: number) =>
  map.buildings.some((b) => insidePolygon(b.ring, x, z));

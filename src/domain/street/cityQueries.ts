import type { AreaKind, CityMap, CitySurface, RoadEdge, Waterway } from './city';
import { closestOnSegment, inBounds, insidePolygon, type Vec2 } from './geometry2d';
import { lanePoint } from './roadNetwork';
import { cellAt, gather, SEG_STRIDE } from './spatialIndex';

/** Lookups on a city: what is at a point, the nearest road and the place's name. */

export interface RoadHit {
  readonly edge: RoadEdge;
  /** Distance from the edge's start node along it. */
  readonly s: number;
  readonly x: number;
  readonly z: number;
  /** Distance from the centreline. */
  readonly d: number;
  /** Heading of the edge (a → b) here. */
  readonly heading: number;
}

function hitOn(edge: RoadEdge, seg: number, x: number, z: number): RoadHit {
  const p = edge.points[seg] as Vec2;
  const q = edge.points[seg + 1] as Vec2;
  const h = closestOnSegment(x, z, p.x, p.z, q.x, q.z);
  const segLen = (edge.cum[seg + 1] ?? 0) - (edge.cum[seg] ?? 0);
  return {
    edge,
    s: (edge.cum[seg] ?? 0) + h.t * segLen,
    x: h.x,
    z: h.z,
    d: h.d,
    heading: Math.atan2(q.z - p.z, q.x - p.x),
  };
}

/** Road segments indexed in the cell under a point. */
function segsAt(map: CityMap, x: number, z: number): readonly number[] {
  return cellAt(map.index, x, z)?.segs ?? [];
}

/**
 * Closest point on any road, searching outward up to `maxM`. `accept`
 * filters which roads count (e.g. only ones cars use).
 */
export function nearestOnRoad(
  map: CityMap,
  x: number,
  z: number,
  maxM = 1500,
  accept: (e: RoadEdge) => boolean = () => true,
): RoadHit | null {
  for (let r = map.index.cellM; r <= maxM * 2; r *= 2) {
    const keys = gather(
      map.index,
      { minX: x - r, minZ: z - r, maxX: x + r, maxZ: z + r },
      (c) => c.segs,
    );
    let best: RoadHit | null = null;
    for (const key of keys) {
      const edge = map.edges[Math.floor(key / SEG_STRIDE)] as RoadEdge;
      if (!accept(edge)) continue;
      const hit = hitOn(edge, key % SEG_STRIDE, x, z);
      if (!best || hit.d < best.d) best = hit;
    }
    if (best && best.d <= r) return best;
  }
  return null;
}

/** The road whose carriageway covers this point, if any. */
export function roadAt(map: CityMap, x: number, z: number): RoadHit | null {
  let best: RoadHit | null = null;
  for (const key of segsAt(map, x, z)) {
    const edge = map.edges[Math.floor(key / SEG_STRIDE)] as RoadEdge;
    const hit = hitOn(edge, key % SEG_STRIDE, x, z);
    if (hit.d <= edge.widthM / 2 && (!best || hit.d / edge.widthM < best.d / best.edge.widthM))
      best = hit;
  }
  return best;
}

const UNBUILT: ReadonlySet<AreaKind> = new Set(['park', 'farmland', 'cemetery', 'pitch']);

/** The most specific land-use area at a point (smallest one wins). */
export function areaAt(map: CityMap, x: number, z: number): AreaKind | null {
  let best: { kind: AreaKind; size: number } | null = null;
  for (const i of cellAt(map.index, x, z)?.areas ?? []) {
    const a = map.areas[i];
    if (!a || !inBounds(a.bounds, x, z) || !insidePolygon(a.ring, x, z)) continue;
    const size = (a.bounds.maxX - a.bounds.minX) * (a.bounds.maxZ - a.bounds.minZ);
    if (!best || size < best.size) best = { kind: a.kind, size };
  }
  return best?.kind ?? null;
}

function inWaterway(w: Waterway, seg: number, x: number, z: number): boolean {
  const p = w.points[seg] as Vec2;
  const q = w.points[seg + 1] as Vec2;
  return closestOnSegment(x, z, p.x, p.z, q.x, q.z).d <= w.widthM / 2;
}

/** What is under a point. Beyond the edge of the map counts as solid (water). */
export function citySurfaceAt(map: CityMap, x: number, z: number): CitySurface {
  if (!inBounds(map.bounds, x, z)) return 'water';
  const cell = cellAt(map.index, x, z);
  if (!cell) return 'grass';
  let sidewalk = false;
  for (const key of cell.segs) {
    const edge = map.edges[Math.floor(key / SEG_STRIDE)] as RoadEdge;
    const d = hitOn(edge, key % SEG_STRIDE, x, z).d;
    if (d <= edge.widthM / 2) return 'road';
    if (d <= edge.widthM / 2 + edge.sidewalkM) sidewalk = true;
  }
  if (sidewalk) return 'sidewalk';
  for (const i of cell.buildings) {
    const b = map.buildings[i];
    if (b && inBounds(b.bounds, x, z) && insidePolygon(b.ring, x, z)) return 'building';
  }
  for (const key of cell.water) {
    const w = map.waterways[Math.floor(key / SEG_STRIDE)];
    if (w && inWaterway(w, key % SEG_STRIDE, x, z)) return 'water';
  }
  const area = areaAt(map, x, z);
  if (area === 'water') return 'water';
  return area && UNBUILT.has(area) ? 'grass' : 'sidewalk';
}

export const isSolid = (s: CitySurface) => s === 'building' || s === 'water';

export interface PlaceName {
  /** Road name under or next to the rider. */
  readonly road: string | null;
  /** 里. */
  readonly village: string | null;
  /** Neighbourhood (右昌, 後勁…). */
  readonly suburb: string | null;
}

export function placeAt(map: CityMap, x: number, z: number): PlaceName {
  const road = roadAt(map, x, z) ?? nearestOnRoad(map, x, z, 40);
  const ringed = map.villages.find((v) => v.ring && insidePolygon(v.ring, x, z));
  const nearest = <T extends Vec2>(list: readonly T[]) =>
    list.reduce<T | null>(
      (best, p) =>
        !best || Math.hypot(p.x - x, p.z - z) < Math.hypot(best.x - x, best.z - z) ? p : best,
      null,
    );
  return {
    road: road && road.d < 40 ? road.edge.name : null,
    village: (ringed ?? nearest(map.villages))?.name ?? null,
    suburb: nearest(map.places)?.name ?? null,
  };
}

export interface RoadPose {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly edge: RoadEdge;
}

/**
 * Closest spot on a road, in the right-hand lane for the direction nearest
 * to `heading` (one-way streets: their own direction).
 */
export function nearestRoadPose(
  map: CityMap,
  x: number,
  z: number,
  heading: number,
  accept?: (e: RoadEdge) => boolean,
): RoadPose {
  const hit = nearestOnRoad(map, x, z, 3000, accept);
  if (!hit) throw new Error('City has no roads');
  const { edge } = hit;
  const forward = edge.oneway || Math.cos(heading - hit.heading) >= 0;
  const s = Math.max(Math.min(3, edge.length / 2), Math.min(edge.length - 3, hit.s));
  const p = lanePoint(edge, s, forward, edge.lanesPerDirection - 1);
  return { x: p.x, z: p.z, heading: p.heading, edge };
}

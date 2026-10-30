import {
  inside,
  type Block,
  type CityMap,
  type CitySurface,
  type District,
  type Road,
} from './city';

/** Lookups on a generated city: what is at a point, and the nearest road. */

/** Index of the gap between sorted grid lines that contains v, or −1 outside. */
function cellIndex(lines: readonly number[], v: number): number {
  for (let i = 0; i < lines.length - 1; i++) {
    if (v >= (lines[i] ?? 0) && v < (lines[i + 1] ?? 0)) return i;
  }
  return -1;
}

export function blockAt(map: CityMap, x: number, z: number): Block | null {
  const ix = cellIndex(map.linesX, x);
  const iz = cellIndex(map.linesZ, z);
  if (ix < 0 || iz < 0) return null;
  const block = map.blocks[iz * map.spec.blocksX + ix];
  return block && inside(block.rect, x, z) ? block : null;
}

/** What is under a point. Off the map and the sea both count as water. */
export function citySurfaceAt(map: CityMap, x: number, z: number): CitySurface {
  if (x < 0 || x > map.width || z < 0 || z >= map.shoreZ) return 'water';
  if (map.roads.some((r) => inside(r.rect, x, z))) return 'road';
  const block = blockAt(map, x, z);
  if (!block) return 'grass'; // promenade between the grid and the expressway
  if (!inside(block.lot, x, z)) return 'sidewalk';
  if (block.buildings.some((b) => inside(b.rect, x, z))) return 'building';
  return block.district === 'park' ? 'grass' : 'sidewalk';
}

export const isSolid = (s: CitySurface) => s === 'building' || s === 'water';

export function districtAt(map: CityMap, x: number, z: number): District {
  const block = blockAt(map, x, z);
  if (block) return block.district;
  return z > (map.linesZ[map.linesZ.length - 1] ?? 0) ? 'waterfront' : 'commercial';
}

export interface RoadPose {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly road: Road;
}

/**
 * Closest spot on a road, in the right-hand lane for the direction nearest
 * to `heading` (Taiwan drives on the right).
 */
export function nearestRoadPose(map: CityMap, x: number, z: number, heading: number): RoadPose {
  let best: RoadPose | null = null;
  let bestD = Infinity;
  for (const road of map.roads) {
    const along = road.axis === 'x' ? x : z;
    const a = Math.min(road.to - 1, Math.max(road.from + 1, along));
    const px = road.axis === 'x' ? a : road.centre;
    const pz = road.axis === 'x' ? road.centre : a;
    const d = Math.hypot(px - x, pz - z);
    if (d >= bestD) continue;
    // Pick the direction along the road closest to the current heading.
    const fx = Math.cos(heading);
    const fz = Math.sin(heading);
    const dir = road.axis === 'x' ? (fx >= 0 ? 1 : -1) : fz >= 0 ? 1 : -1;
    const h = road.axis === 'x' ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    // Right of travel is (−sin h, cos h).
    const lane = road.widthM / 4;
    bestD = d;
    best = { x: px - Math.sin(h) * lane, z: pz + Math.cos(h) * lane, heading: h, road };
  }
  if (!best) throw new Error('City has no roads');
  return best;
}

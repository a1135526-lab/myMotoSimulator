import type { AreaKind, CityMap } from '@/domain';
import type { ChunkedBuilders } from './chunks';
import { band } from './polyline';

/** Land use from the map: parks and fields, school grounds, yards, rivers and their banks. */

export type LandPart = 'grass' | 'water' | 'yard' | 'school' | 'bank';

export const GRASS_TILE_M = 12;
const TILE_M = 6;

/** Height per layer, so overlapping areas stack instead of flickering. */
const LAYER: Partial<Record<AreaKind, { part: LandPart; y: number }>> = {
  industrial: { part: 'yard', y: 0.008 },
  farmland: { part: 'grass', y: 0.012 },
  cemetery: { part: 'grass', y: 0.014 },
  park: { part: 'grass', y: 0.016 },
  school: { part: 'school', y: 0.02 },
  pitch: { part: 'grass', y: 0.024 },
  water: { part: 'water', y: 0.03 },
};

export function buildLand(parts: ChunkedBuilders<LandPart>, map: CityMap) {
  for (const a of map.areas) {
    const layer = LAYER[a.kind];
    if (!layer) continue;
    const cx = (a.bounds.minX + a.bounds.maxX) / 2;
    const cz = (a.bounds.minZ + a.bounds.maxZ) / 2;
    parts
      .at(layer.part, cx, cz)
      .polygon(a.ring, layer.y, layer.part === 'grass' ? GRASS_TILE_M : TILE_M);
  }
  // Rivers run in concrete channels here: water between two banks.
  for (const w of map.waterways) {
    const mid = w.points[Math.floor(w.points.length / 2)] ?? { x: 0, z: 0 };
    const half = w.widthM / 2;
    band(parts.at('water', mid.x, mid.z), w.points, -half, half, 0.035, TILE_M);
    band(parts.at('bank', mid.x, mid.z), w.points, -half - 1.6, -half, 0.04, TILE_M);
    band(parts.at('bank', mid.x, mid.z), w.points, half, half + 1.6, 0.04, TILE_M);
  }
}

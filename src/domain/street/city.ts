import type { Bounds, Vec2 } from './geometry2d';
import type { SpatialIndex } from './spatialIndex';

/**
 * A real city's streets for free riding, on the ground plane (x east,
 * z south, metres from the map centre). Roads form a graph: nodes are
 * junctions and dead ends, edges the polylines between them.
 */

export type RoadClass =
  'primary' | 'secondary' | 'tertiary' | 'unclassified' | 'residential' | 'living_street' | 'link';
export const ROAD_CLASSES: readonly RoadClass[] = [
  'primary',
  'secondary',
  'tertiary',
  'unclassified',
  'residential',
  'living_street',
  'link',
];

export type AreaKind =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'park'
  | 'school'
  | 'water'
  | 'farmland'
  | 'pitch'
  | 'cemetery'
  | 'military';
export const AREA_KINDS: readonly AreaKind[] = [
  'residential',
  'commercial',
  'industrial',
  'park',
  'school',
  'water',
  'farmland',
  'pitch',
  'cemetery',
  'military',
];

export type PoiKind =
  | 'station'
  | 'mrt'
  | 'university'
  | 'school'
  | 'hospital'
  | 'park'
  | 'temple'
  | 'convenience'
  | 'fuel'
  | 'government'
  | 'market'
  | 'food'
  | 'landmark';
export const POI_KINDS: readonly PoiKind[] = [
  'station',
  'mrt',
  'university',
  'school',
  'hospital',
  'park',
  'temple',
  'convenience',
  'fuel',
  'government',
  'market',
  'food',
  'landmark',
];

/**
 * Compact import of map data (see scripts/osm). Indices into `names` are −1
 * for unnamed. Flat coordinate lists are [x0, z0, x1, z1, …].
 */
export interface CityData {
  readonly name: string;
  readonly attribution: string;
  readonly bounds: Bounds;
  readonly names: readonly string[];
  /** Junction positions, flat. */
  readonly nodes: readonly number[];
  /** Junctions with traffic lights. */
  readonly signals: readonly number[];
  /** [a, b, name, class, lanes, oneway (1 a→b, −1 b→a, 0 both), …interior points]. */
  readonly edges: readonly (readonly number[])[];
  /** [kind, name, …ring]. */
  readonly areas: readonly (readonly number[])[];
  /** [width m, name, …line]. */
  readonly waterways: readonly (readonly number[])[];
  /** [levels (0 = unknown), …ring]. */
  readonly buildings: readonly (readonly number[])[];
  /** [kind, name, x, z]. */
  readonly pois: readonly (readonly number[])[];
  /** Suburbs: [name, x, z]. */
  readonly places: readonly (readonly number[])[];
  /** 里: [name, centre x, centre z, …boundary ring (may be empty)]. */
  readonly villages: readonly (readonly number[])[];
}

export interface RoadNode {
  readonly id: number;
  readonly x: number;
  readonly z: number;
  /** Edges meeting here. */
  readonly edges: readonly number[];
  readonly signal: boolean;
  /** Clear radius of the junction box: edges start their markings past it. */
  readonly radius: number;
}

export interface RoadEdge {
  readonly id: number;
  readonly a: number;
  readonly b: number;
  readonly name: string | null;
  readonly cls: RoadClass;
  readonly lanes: number;
  /** Traffic only goes a → b. */
  readonly oneway: boolean;
  readonly lanesPerDirection: number;
  /** Carriageway width, m. */
  readonly widthM: number;
  /** Sidewalk each side, m (0 for lanes without one). */
  readonly sidewalkM: number;
  /** Polyline a → b, including both ends. */
  readonly points: readonly Vec2[];
  /** Distance along the polyline at each point. */
  readonly cum: readonly number[];
  readonly length: number;
}

export interface Area {
  readonly kind: AreaKind;
  readonly name: string | null;
  readonly ring: readonly Vec2[];
  readonly bounds: Bounds;
}

export interface Waterway {
  readonly widthM: number;
  readonly name: string | null;
  readonly points: readonly Vec2[];
}

export type BuildingStyle = 'townhouse' | 'shophouse' | 'tower' | 'factory' | 'mapped';

export interface Building {
  readonly ring: readonly Vec2[];
  readonly heightM: number;
  readonly style: BuildingStyle;
  /** 0–1, for facade and colour variety. */
  readonly look: number;
  /** Ring edge index of the street front (−1 when unknown). */
  readonly front: number;
  readonly bounds: Bounds;
}

export interface Poi {
  readonly id: number;
  readonly kind: PoiKind;
  readonly name: string;
  readonly x: number;
  readonly z: number;
}

export interface Village {
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly ring: readonly Vec2[] | null;
}

export interface CityMap {
  readonly name: string;
  readonly attribution: string;
  readonly bounds: Bounds;
  readonly nodes: readonly RoadNode[];
  readonly edges: readonly RoadEdge[];
  readonly areas: readonly Area[];
  readonly waterways: readonly Waterway[];
  readonly buildings: readonly Building[];
  readonly pois: readonly Poi[];
  readonly places: readonly { readonly name: string; readonly x: number; readonly z: number }[];
  readonly villages: readonly Village[];
  readonly index: SpatialIndex;
  readonly spawn: { readonly x: number; readonly z: number; readonly heading: number };
}

export type CitySurface = 'road' | 'sidewalk' | 'grass' | 'building' | 'water';

/** Small fast deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

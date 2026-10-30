/**
 * Procedural open-world city, on the ground plane (x east, z south, metres).
 *
 * A grid of blocks separated by streets, with wider avenues every few lines
 * and an expressway along the south edge by the sea. Each block belongs to a
 * district that sets what is built on it. Everything comes from a seeded
 * generator, so the same spec always gives the same city.
 */

export type District =
  'downtown' | 'commercial' | 'residential' | 'industrial' | 'park' | 'waterfront';

export type RoadKind = 'street' | 'avenue' | 'expressway';

export interface Rect {
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
}

export interface Road {
  readonly id: number;
  readonly kind: RoadKind;
  /** 'x': runs east–west (constant z); 'z': runs north–south (constant x). */
  readonly axis: 'x' | 'z';
  /** Centreline coordinate across the road (z for an 'x' road, x for a 'z' road). */
  readonly centre: number;
  readonly widthM: number;
  /** Extent along the road. */
  readonly from: number;
  readonly to: number;
  readonly lanesPerDirection: number;
  readonly rect: Rect;
}

export interface Building {
  readonly rect: Rect;
  readonly heightM: number;
  /** 0–1 per building, for facade / colour variety. */
  readonly look: number;
}

export interface Block {
  /** Inner edge of the sidewalk (the kerb line). */
  readonly rect: Rect;
  /** Buildable area inside the sidewalk. */
  readonly lot: Rect;
  readonly district: District;
  readonly buildings: readonly Building[];
  /** Grid cell, for lookups. */
  readonly ix: number;
  readonly iz: number;
}

export interface CitySpec {
  readonly name: string;
  readonly seed: number;
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly blockM: number;
  readonly streetWidthM: number;
  readonly avenueWidthM: number;
  /** Every n-th grid line is an avenue (lines 0 and last always are). */
  readonly avenueEvery: number;
  readonly sidewalkM: number;
  readonly expresswayWidthM: number;
  /** Green strip between the last grid road and the expressway. */
  readonly promenadeM: number;
  /** Open sea beyond the expressway, before the map edge. */
  readonly seaM: number;
  readonly districtNames: Readonly<Record<District, string>>;
}

export interface CityMap {
  readonly spec: CitySpec;
  readonly width: number;
  readonly depth: number;
  readonly roads: readonly Road[];
  readonly blocks: readonly Block[];
  /** Grid line centres, west → east and north → south. */
  readonly linesX: readonly number[];
  readonly linesZ: readonly number[];
  /** z where the sea starts (everything south is water). */
  readonly shoreZ: number;
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

export const inside = (r: Rect, x: number, z: number) =>
  x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

const lineWidth = (spec: CitySpec, i: number, count: number) =>
  i === 0 || i === count - 1 || i % spec.avenueEvery === 0 ? spec.avenueWidthM : spec.streetWidthM;

function gridLines(spec: CitySpec, blocks: number): number[] {
  const lines: number[] = [];
  let c = lineWidth(spec, 0, blocks + 1) / 2;
  for (let i = 0; i <= blocks; i++) {
    lines.push(c);
    c += lineWidth(spec, i, blocks + 1) / 2 + spec.blockM + lineWidth(spec, i + 1, blocks + 1) / 2;
  }
  return lines;
}

/** District by position: towers in the middle, port in the south-east, homes to the north. */
function districtFor(spec: CitySpec, ix: number, iz: number, rnd: () => number): District {
  const cx = (spec.blocksX - 1) / 2;
  const cz = (spec.blocksZ - 1) / 2;
  const r = Math.hypot(ix - cx, iz - cz);
  if (iz === spec.blocksZ - 1) return ix % 3 === 1 ? 'park' : 'waterfront';
  if (r < 1.3) return 'downtown';
  if (ix >= spec.blocksX - 3 && iz >= spec.blocksZ - 4) return 'industrial';
  if (r < 2.6) return rnd() < 0.12 ? 'park' : 'commercial';
  return rnd() < 0.1 ? 'park' : 'residential';
}

const HEIGHTS: Readonly<Record<District, [number, number]>> = {
  downtown: [45, 160],
  commercial: [14, 48],
  residential: [9, 24],
  industrial: [8, 16],
  waterfront: [6, 18],
  park: [0, 0],
};
/** Lot frontage per building, m, by district. */
const LOT_M: Readonly<Record<District, [number, number]>> = {
  downtown: [34, 56],
  commercial: [16, 30],
  residential: [10, 18],
  industrial: [36, 60],
  waterfront: [20, 34],
  park: [0, 0],
};
const BUILDING_GAP_M = 2;

/** Split a lot into a ring of buildings along its edges (courtyard left open in big blocks). */
function buildingsFor(lot: Rect, district: District, rnd: () => number): Building[] {
  if (district === 'park') return [];
  const [hMin, hMax] = HEIGHTS[district];
  const [wMin, wMax] = LOT_M[district];
  const out: Building[] = [];
  const depthM = Math.min((lot.z1 - lot.z0) / 2 - 1, district === 'downtown' ? 50 : 26);
  const height = () => {
    const t = rnd();
    // Most buildings low, a few tall: skew toward the bottom of the range.
    return Math.round(hMin + (hMax - hMin) * t * t);
  };
  for (const side of ['north', 'south'] as const) {
    let x = lot.x0;
    while (x < lot.x1 - wMin * 0.6) {
      const w = Math.min(lot.x1 - x, wMin + rnd() * (wMax - wMin));
      const z0 = side === 'north' ? lot.z0 : lot.z1 - depthM;
      out.push({
        rect: { x0: x, z0, x1: x + w - BUILDING_GAP_M, z1: z0 + depthM },
        heightM: height(),
        look: rnd(),
      });
      x += w;
    }
  }
  // Fill the side streets too, leaving a courtyard in the middle.
  const zA = lot.z0 + depthM + BUILDING_GAP_M;
  const zB = lot.z1 - depthM - BUILDING_GAP_M;
  const sideDepth = Math.min((lot.x1 - lot.x0) / 3, 22);
  if (zB - zA > wMin * 0.6) {
    for (const side of ['west', 'east'] as const) {
      let z = zA;
      while (z < zB - 4) {
        const w = Math.min(zB - z, wMin + rnd() * (wMax - wMin));
        const x0 = side === 'west' ? lot.x0 : lot.x1 - sideDepth;
        out.push({
          rect: { x0, z0: z, x1: x0 + sideDepth, z1: z + w - BUILDING_GAP_M },
          heightM: height(),
          look: rnd(),
        });
        z += w;
      }
    }
  }
  return out;
}

export function generateCity(spec: CitySpec): CityMap {
  const rnd = seededRandom(spec.seed);
  const linesX = gridLines(spec, spec.blocksX);
  const linesZ = gridLines(spec, spec.blocksZ);
  const lastX = linesX[linesX.length - 1] ?? 0;
  const lastZ = linesZ[linesZ.length - 1] ?? 0;
  const width = lastX + lineWidth(spec, spec.blocksX, spec.blocksX + 1) / 2;
  const gridEndZ = lastZ + lineWidth(spec, spec.blocksZ, spec.blocksZ + 1) / 2;
  const expresswayZ = gridEndZ + spec.promenadeM + spec.expresswayWidthM / 2;
  const shoreZ = expresswayZ + spec.expresswayWidthM / 2 + 6;
  const depth = shoreZ + spec.seaM;

  const roads: Road[] = [];
  const lanes = (w: number) => (w >= spec.avenueWidthM ? 2 : 1);
  linesX.forEach((x, i) => {
    const w = lineWidth(spec, i, linesX.length);
    // North–south roads run down to the expressway.
    roads.push({
      id: roads.length,
      kind: w >= spec.avenueWidthM ? 'avenue' : 'street',
      axis: 'z',
      centre: x,
      widthM: w,
      from: 0,
      to: expresswayZ,
      lanesPerDirection: lanes(w),
      rect: { x0: x - w / 2, z0: 0, x1: x + w / 2, z1: expresswayZ },
    });
  });
  linesZ.forEach((z, i) => {
    const w = lineWidth(spec, i, linesZ.length);
    roads.push({
      id: roads.length,
      kind: w >= spec.avenueWidthM ? 'avenue' : 'street',
      axis: 'x',
      centre: z,
      widthM: w,
      from: 0,
      to: width,
      lanesPerDirection: lanes(w),
      rect: { x0: 0, z0: z - w / 2, x1: width, z1: z + w / 2 },
    });
  });
  const ew = spec.expresswayWidthM;
  roads.push({
    id: roads.length,
    kind: 'expressway',
    axis: 'x',
    centre: expresswayZ,
    widthM: ew,
    from: 0,
    to: width,
    lanesPerDirection: 3,
    rect: { x0: 0, z0: expresswayZ - ew / 2, x1: width, z1: expresswayZ + ew / 2 },
  });

  const blocks: Block[] = [];
  for (let iz = 0; iz < spec.blocksZ; iz++) {
    for (let ix = 0; ix < spec.blocksX; ix++) {
      const x0 = (linesX[ix] ?? 0) + lineWidth(spec, ix, linesX.length) / 2;
      const x1 = (linesX[ix + 1] ?? 0) - lineWidth(spec, ix + 1, linesX.length) / 2;
      const z0 = (linesZ[iz] ?? 0) + lineWidth(spec, iz, linesZ.length) / 2;
      const z1 = (linesZ[iz + 1] ?? 0) - lineWidth(spec, iz + 1, linesZ.length) / 2;
      const rect = { x0, z0, x1, z1 };
      const s = spec.sidewalkM;
      const lot = { x0: x0 + s, z0: z0 + s, x1: x1 - s, z1: z1 - s };
      const district = districtFor(spec, ix, iz, rnd);
      blocks.push({ rect, lot, district, buildings: buildingsFor(lot, district, rnd), ix, iz });
    }
  }

  // Start on the main avenue nearest the middle, heading north.
  const mid = linesX[Math.round(spec.blocksX / 2)] ?? width / 2;
  return {
    spec,
    width,
    depth,
    roads,
    blocks,
    linesX,
    linesZ,
    shoreZ,
    spawn: { x: mid + 2.5, z: gridEndZ - 20, heading: -Math.PI / 2 },
  };
}

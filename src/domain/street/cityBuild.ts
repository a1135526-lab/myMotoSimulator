import { generateBuildings } from './buildingGen';
import {
  AREA_KINDS,
  POI_KINDS,
  type Area,
  type Building,
  type CityData,
  type CityMap,
  type Poi,
  type RoadEdge,
  type Village,
  type Waterway,
} from './city';
import { nearestRoadPose } from './cityQueries';
import { boundsOf, pointsOf, type Bounds, type Vec2 } from './geometry2d';
import { buildRoads } from './roadNetwork';
import { cellsIn, createIndex, SEG_STRIDE, type SpatialIndex } from './spatialIndex';

/** Turn imported map data into a rideable city: roads, areas, buildings and a spatial index. */

export interface CityOptions {
  /** Seed for the buildings filled in where the map has none. */
  readonly seed: number;
  /** Start near here (snapped onto the closest road)… */
  readonly spawnNear: Vec2;
  /** …with this name, if given. */
  readonly spawnRoad?: string;
}

const CELL_M = 32;
const STOREY_M = 3.2;
/** Mapped buildings without a storey count: a typical 4-storey 透天. */
const DEFAULT_LEVELS = 4;

const segBounds = (p: Vec2, q: Vec2, pad: number): Bounds => ({
  minX: Math.min(p.x, q.x) - pad,
  minZ: Math.min(p.z, q.z) - pad,
  maxX: Math.max(p.x, q.x) + pad,
  maxZ: Math.max(p.z, q.z) + pad,
});

export function indexEdges(index: SpatialIndex, edges: readonly RoadEdge[]) {
  for (const e of edges) {
    const pad = e.widthM / 2 + e.sidewalkM + 2;
    for (let i = 0; i + 1 < e.points.length; i++) {
      const key = e.id * SEG_STRIDE + i;
      cellsIn(index, segBounds(e.points[i] as Vec2, e.points[i + 1] as Vec2, pad), true, (c) =>
        c.segs.push(key),
      );
    }
  }
}

export function indexBuilding(index: SpatialIndex, building: Building, id: number) {
  cellsIn(index, building.bounds, true, (c) => c.buildings.push(id));
}

export function buildCity(data: CityData, options: CityOptions): CityMap {
  const { nodes, edges } = buildRoads(data);
  const name = (i: number | undefined) => (i === undefined ? null : (data.names[i] ?? null));
  const pad = 400;
  const b = data.bounds;
  const index = createIndex(
    { minX: b.minX - pad, minZ: b.minZ - pad, maxX: b.maxX + pad, maxZ: b.maxZ + pad },
    CELL_M,
  );
  indexEdges(index, edges);

  const areas: Area[] = data.areas.map((a) => {
    const ring = pointsOf(a, 2);
    return {
      kind: AREA_KINDS[a[0] ?? 0] ?? 'residential',
      name: name(a[1]),
      ring,
      bounds: boundsOf(ring),
    };
  });
  areas.forEach((a, i) => cellsIn(index, a.bounds, true, (c) => c.areas.push(i)));

  const waterways: Waterway[] = data.waterways.map((w) => ({
    widthM: w[0] ?? 4,
    name: name(w[1]),
    points: pointsOf(w, 2),
  }));
  waterways.forEach((w, wi) => {
    for (let i = 0; i + 1 < w.points.length; i++) {
      const box = segBounds(w.points[i] as Vec2, w.points[i + 1] as Vec2, w.widthM / 2 + 1);
      cellsIn(index, box, true, (c) => c.water.push(wi * SEG_STRIDE + i));
    }
  });

  const buildings: Building[] = data.buildings.map((raw) => {
    const ring = pointsOf(raw, 1);
    const levels = (raw[0] ?? 0) > 0 ? (raw[0] ?? 0) : DEFAULT_LEVELS;
    const look = Math.abs(Math.sin((ring[0]?.x ?? 0) * 12.9898 + (ring[0]?.z ?? 0) * 78.233)) % 1;
    return {
      ring,
      heightM: levels * STOREY_M + 0.6,
      style: 'mapped',
      look,
      front: -1,
      bounds: boundsOf(ring),
    };
  });
  buildings.forEach((bd, i) => indexBuilding(index, bd, i));

  const pois: Poi[] = data.pois.map((p, id) => ({
    id,
    kind: POI_KINDS[p[0] ?? 0] ?? 'landmark',
    name: name(p[1]) ?? '',
    x: p[2] ?? 0,
    z: p[3] ?? 0,
  }));
  const places = data.places.map((p) => ({ name: name(p[0]) ?? '', x: p[1] ?? 0, z: p[2] ?? 0 }));
  const villages: Village[] = data.villages.map((v) => {
    const ring = pointsOf(v, 3);
    return {
      name: name(v[0]) ?? '',
      x: v[1] ?? 0,
      z: v[2] ?? 0,
      ring: ring.length >= 3 ? ring : null,
    };
  });

  const partial = {
    name: data.name,
    attribution: data.attribution,
    bounds: data.bounds,
    nodes,
    edges,
    areas,
    waterways,
    buildings,
    pois,
    places,
    villages,
    index,
    spawn: { x: 0, z: 0, heading: 0 },
  };
  generateBuildings(partial, buildings, options.seed);
  const { spawnNear, spawnRoad } = options;
  const pose = nearestRoadPose(partial, spawnNear.x, spawnNear.z, 0, (e) =>
    spawnRoad ? e.name === spawnRoad : true,
  );
  return { ...partial, spawn: { x: pose.x, z: pose.z, heading: pose.heading } };
}

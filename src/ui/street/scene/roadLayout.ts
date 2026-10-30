import * as THREE from 'three';
import type { Block, CityMap, Road } from '@/domain';
import type { QuadBuilder } from './geometryBuilder';

/** Road surfaces, markings, kerbed blocks and kerbside placement for the city scene. */

/** Kerb height: sidewalks and blocks sit this far above the road. */
export const KERB_M = 0.15;
const ROAD_Y = 0.01;
const MARK_Y = 0.02;
export const ASPHALT_TILE_M = 8;
export const PAVER_TILE_M = 4;
export const GRASS_TILE_M = 12;
const CROSSWALK_M = 4;

/** Small deterministic hash → 0..1, so decoration is stable between visits. */
export const hash = (a: number, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Intervals along `road` covered by the roads crossing it. */
function junctions(map: CityMap, road: Road): [number, number][] {
  return map.roads
    .filter(
      (r) =>
        r.axis !== road.axis &&
        road.centre >= r.from - 1 &&
        road.centre <= r.to + 1 &&
        r.centre >= road.from - 1 &&
        r.centre <= road.to + 1,
    )
    .map((r): [number, number] => [r.centre - r.widthM / 2, r.centre + r.widthM / 2])
    .sort((a, b) => a[0] - b[0]);
}

/** Free stretches of a road between junctions. */
function stretches(road: Road, cuts: [number, number][]) {
  const out: { a: number; b: number; startJ: boolean; endJ: boolean }[] = [];
  let a = road.from;
  let startJ = false;
  for (const [c0, c1] of cuts) {
    if (c0 > a + 0.5) out.push({ a, b: c0, startJ, endJ: true });
    a = Math.max(a, c1);
    startJ = true;
  }
  if (road.to > a + 0.5) out.push({ a, b: road.to, startJ, endJ: false });
  return out;
}

/** A rectangle in road coordinates (along a0..a1, across c0..c1 from the centreline). */
function onRoad(b: QuadBuilder, road: Road, a0: number, a1: number, c0: number, c1: number) {
  if (road.axis === 'x') b.floor(a0, road.centre + c0, a1, road.centre + c1, MARK_Y, 1);
  else b.floor(road.centre + c0, a0, road.centre + c1, a1, MARK_Y, 1);
}

function dashed(
  b: QuadBuilder,
  road: Road,
  a0: number,
  a1: number,
  c: number,
  dash: number,
  gap: number,
) {
  for (let a = a0; a < a1; a += dash + gap) {
    onRoad(b, road, a, Math.min(a + dash, a1), c - 0.075, c + 0.075);
  }
}

export function markRoad(map: CityMap, road: Road, white: QuadBuilder, yellow: QuadBuilder) {
  const half = road.widthM / 2;
  const laneW = half / road.lanesPerDirection;
  for (const s of stretches(road, junctions(map, road))) {
    const m0 = s.a + (s.startJ ? CROSSWALK_M + 2 : 0);
    const m1 = s.b - (s.endJ ? CROSSWALK_M + 2 : 0);
    if (m1 - m0 < 2) continue;
    // Edge lines
    onRoad(white, road, m0, m1, half - 0.45, half - 0.3);
    onRoad(white, road, m0, m1, -half + 0.3, -half + 0.45);
    // Centre: double yellow on big roads, dashed white on side streets.
    if (road.kind === 'street') dashed(white, road, m0, m1, 0, 3, 3);
    else {
      onRoad(yellow, road, m0, m1, -0.28, -0.12);
      onRoad(yellow, road, m0, m1, 0.12, 0.28);
    }
    for (let k = 1; k < road.lanesPerDirection; k++) {
      dashed(white, road, m0, m1, k * laneW, 4, 6);
      dashed(white, road, m0, m1, -k * laneW, 4, 6);
    }
    // Zebra crossings and stop lines at junctions (traffic keeps right:
    // eastbound / southbound use the + side of an 'x' road, − side of a 'z' road).
    const zebra = (from: number, to: number) => {
      for (let c = -half + 0.8; c < half - 0.8; c += 1.1)
        onRoad(white, road, from, to, c, c + 0.55);
    };
    const sign = road.axis === 'x' ? 1 : -1;
    if (s.startJ) {
      zebra(s.a + 0.8, s.a + CROSSWALK_M);
      onRoad(white, road, s.a + CROSSWALK_M + 0.8, s.a + CROSSWALK_M + 1.2, ...span(-sign, half));
    }
    if (s.endJ) {
      zebra(s.b - CROSSWALK_M, s.b - 0.8);
      onRoad(white, road, s.b - CROSSWALK_M - 1.2, s.b - CROSSWALK_M - 0.8, ...span(sign, half));
    }
  }
}

/** The half of the road on side `side` (±1), as an across range. */
const span = (side: number, half: number): [number, number] =>
  side > 0 ? [0.3, half - 0.3] : [-half + 0.3, -0.3];

export function roadSurfaces(map: CityMap, asphalt: QuadBuilder) {
  const zRoads = map.roads.filter((r) => r.axis === 'z');
  const express = map.roads.find((r) => r.kind === 'expressway');
  const stopZ = express ? express.rect.z0 : Infinity;
  for (const r of zRoads) {
    asphalt.floor(
      r.rect.x0,
      r.rect.z0,
      r.rect.x1,
      Math.min(r.rect.z1, stopZ),
      ROAD_Y,
      ASPHALT_TILE_M,
    );
  }
  for (const r of map.roads.filter((x) => x.axis === 'x')) {
    if (r.kind === 'expressway') {
      asphalt.floor(r.rect.x0, r.rect.z0, r.rect.x1, r.rect.z1, ROAD_Y, ASPHALT_TILE_M);
      continue;
    }
    let x = r.rect.x0;
    for (const z of zRoads) {
      if (z.rect.x0 > x) asphalt.floor(x, r.rect.z0, z.rect.x0, r.rect.z1, ROAD_Y, ASPHALT_TILE_M);
      x = Math.max(x, z.rect.x1);
    }
    if (r.rect.x1 > x) asphalt.floor(x, r.rect.z0, r.rect.x1, r.rect.z1, ROAD_Y, ASPHALT_TILE_M);
  }
}

export function blockSurfaces(
  block: Block,
  pavers: QuadBuilder,
  curbs: QuadBuilder,
  grass: QuadBuilder,
  yard: QuadBuilder,
) {
  const { x0, z0, x1, z1 } = block.rect;
  pavers.floor(x0, z0, x1, z1, KERB_M, PAVER_TILE_M);
  curbs.wall(x0, z1, x1, z1, 0, KERB_M, 2, 1);
  curbs.wall(x1, z0, x0, z0, 0, KERB_M, 2, 1);
  curbs.wall(x1, z1, x1, z0, 0, KERB_M, 2, 1);
  curbs.wall(x0, z0, x0, z1, 0, KERB_M, 2, 1);
  const l = block.lot;
  if (block.district === 'park') {
    grass.floor(l.x0, l.z0, l.x1, l.z1, KERB_M + 0.005, GRASS_TILE_M);
    // Crossing footpaths.
    const mx = (l.x0 + l.x1) / 2;
    const mz = (l.z0 + l.z1) / 2;
    pavers.floor(mx - 2, l.z0, mx + 2, l.z1, KERB_M + 0.01, PAVER_TILE_M);
    pavers.floor(l.x0, mz - 2, l.x1, mz + 2, KERB_M + 0.01, PAVER_TILE_M);
  } else if (block.district === 'industrial') {
    yard.floor(l.x0, l.z0, l.x1, l.z1, KERB_M + 0.005, ASPHALT_TILE_M);
  }
}

/** Lay instances along both kerbs of every road, skipping junctions. */
export function alongRoads(
  map: CityMap,
  every: number,
  offsetFromEdge: number,
  phase: number,
  place: (x: number, z: number, facingRoad: number, road: Road) => void,
) {
  for (const road of map.roads) {
    for (const s of stretches(road, junctions(map, road))) {
      for (let a = s.a + CROSSWALK_M + phase; a < s.b - CROSSWALK_M; a += every) {
        for (const side of [-1, 1]) {
          const off = side * (road.widthM / 2 + offsetFromEdge);
          // Yaw so the instance's +x points back at the road.
          if (road.axis === 'x')
            place(a, road.centre + off, side > 0 ? Math.PI / 2 : -Math.PI / 2, road);
          else place(road.centre + off, a, side > 0 ? Math.PI : 0, road);
        }
      }
    }
  }
}

export const matrix = (x: number, y: number, z: number, yaw: number, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
    new THREE.Vector3(sx, sy, sz),
  );

export function instanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  matrices: readonly THREE.Matrix4[],
  shadows = true,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.count = matrices.length;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Chunk size for spatially split instancing, m. */
const CHUNK_M = 250;

/**
 * Like {@link instanced}, but split into map chunks so whole chunks off
 * screen are culled instead of drawing every instance in the city.
 * `color` gives an optional per-instance colour (by original index).
 */
export function instancedChunks(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  matrices: readonly THREE.Matrix4[],
  shadows = true,
  color?: (i: number) => THREE.Color,
): THREE.Group {
  const group = new THREE.Group();
  const cells = new Map<string, number[]>();
  const p = new THREE.Vector3();
  matrices.forEach((m, i) => {
    p.setFromMatrixPosition(m);
    const key = `${Math.floor(p.x / CHUNK_M)},${Math.floor(p.z / CHUNK_M)}`;
    const list = cells.get(key);
    if (list) list.push(i);
    else cells.set(key, [i]);
  });
  for (const ids of cells.values()) {
    const mesh = instanced(
      geometry,
      material,
      ids.map((i) => matrices[i] as THREE.Matrix4),
      shadows,
    );
    if (color) ids.forEach((id, k) => mesh.setColorAt(k, color(id)));
    group.add(mesh);
  }
  return group;
}

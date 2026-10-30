import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { citySurfaceAt, insidePolygon, pointAlong, roadAt, type TimeOfDay } from '@/application';
import type { CityMap, RoadClass, RoadEdge } from '@/domain';
import { signTexture } from './cityTextures';
import { hash, instanced, instancedChunks, matrix } from './roadLayout';
import { SIDEWALK_Y } from './roadMeshes';

/** Street furniture, all instanced: lamps, trees, signs and roof kit. */

const LAMP_EVERY_M = 35;
const TREE_EVERY_M = 14;
const LIT: ReadonlySet<RoadClass> = new Set(['primary', 'secondary', 'tertiary', 'link']);
/** At most this many trees per park, and one per this many m². */
const PARK_TREES_MAX = 160;
const PARK_M2_PER_TREE = 260;

/** How much the city glows, by time of day. */
export const GLOW: Readonly<Record<TimeOfDay, { windows: number; lamps: number; signs: number }>> =
  {
    day: { windows: 0, lamps: 0, signs: 0.25 },
    dusk: { windows: 0.7, lamps: 1.6, signs: 1 },
    night: { windows: 1.5, lamps: 2.6, signs: 1.6 },
  };

/** Shared scene-building context: the group to add to and resource tracking. */
export interface Kit {
  readonly group: THREE.Group;
  readonly glow: (typeof GLOW)[TimeOfDay];
  readonly anisotropy: number;
  keep<T extends { dispose(): void }>(x: T): T;
  mat(p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial;
}

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgb(255 255 255 / 1)');
  g.addColorStop(0.5, 'rgb(255 255 255 / 0.35)');
  g.addColorStop(1, 'rgb(255 255 255 / 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function addRoofKitAndSigns(
  kit: Kit,
  tanks: readonly THREE.Matrix4[],
  units: readonly THREE.Matrix4[],
  signs: readonly THREE.Matrix4[][],
): void {
  const { group, keep, mat, glow } = kit;
  const o = { anisotropy: kit.anisotropy };
  // Rooftop water tanks and plant rooms.
  const steel = mat({ color: '#c9ced3', roughness: 0.35, metalness: 0.85 });
  const tankGeo = keep(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 16).translate(0, 0.8, 0));
  group.add(instanced(tankGeo, steel, tanks));
  const unitGeo = keep(new THREE.BoxGeometry(3, 1.4, 2).translate(0, 0.7, 0));
  group.add(instanced(unitGeo, mat({ color: '#9da3a8', roughness: 0.7 }), units));

  // Shop signs: lit panels on both faces, plain edges.
  const signGeo = keep(new THREE.BoxGeometry(1.0, 3.2, 0.22).translate(0.5, 1.6, 0));
  const edge = mat({ color: '#2a2d31', roughness: 0.6 });
  signs.forEach((list, k) => {
    if (list.length === 0) return;
    const face = keep(signTexture(k, o));
    const m = mat({
      map: face,
      emissiveMap: face,
      emissive: '#ffffff',
      emissiveIntensity: glow.signs,
      roughness: 0.5,
    });
    group.add(instanced(signGeo, [edge, edge, edge, edge, m, m], list, false));
  });
}

/**
 * Spots along both sides of every edge passing `include`, `every` m apart and
 * `fromKerb` m out from the carriageway, clear of junctions. `yaw` turns an
 * instance's +x back towards the road.
 */
export function alongEdges(
  map: CityMap,
  include: (e: RoadEdge) => boolean,
  every: number,
  fromKerb: (e: RoadEdge) => number,
  phase: number,
  place: (x: number, z: number, yaw: number, e: RoadEdge) => void,
) {
  for (const e of map.edges) {
    if (!include(e)) continue;
    const t0 = (map.nodes[e.a]?.radius ?? 0) + 2 + phase;
    const t1 = e.length - (map.nodes[e.b]?.radius ?? 0) - 2;
    for (let s = t0; s < t1; s += every) {
      const p = pointAlong(e, s);
      const nx = -Math.sin(p.heading);
      const nz = Math.cos(p.heading);
      for (const side of [1, -1]) {
        const o = side * (e.widthM / 2 + fromKerb(e));
        const x = p.x + nx * o;
        const z = p.z + nz * o;
        // Not on another road (dual carriageways, side streets).
        const other = roadAt(map, x, z);
        if (other && other.edge.id !== e.id) continue;
        place(x, z, Math.atan2(nz * side, -nx * side), e);
      }
    }
  }
}

export function addStreetLights(kit: Kit, map: CityMap): void {
  const { group, keep, mat, glow } = kit;
  // Street lights along the bigger roads, with pools of light at night.
  const lamps: THREE.Matrix4[] = [];
  alongEdges(
    map,
    (e) => LIT.has(e.cls),
    LAMP_EVERY_M,
    () => 0.6,
    0,
    (x, z, yaw) => lamps.push(matrix(x, SIDEWALK_Y, z, yaw)),
  );
  const poleMat = mat({ color: '#5c6166', roughness: 0.5, metalness: 0.6 });
  const pole = keep(new THREE.CylinderGeometry(0.07, 0.11, 8, 8).translate(0, 4, 0));
  const arm = keep(new THREE.BoxGeometry(2.4, 0.1, 0.1).translate(1.2, 7.9, 0));
  const headGeo = keep(new THREE.BoxGeometry(0.8, 0.16, 0.34).translate(2.2, 7.8, 0));
  const headMat = mat({
    color: '#d9d9d2',
    emissive: '#ffd59a',
    emissiveIntensity: glow.lamps,
    roughness: 0.4,
  });
  group.add(instancedChunks(pole, poleMat, lamps), instancedChunks(arm, poleMat, lamps, false));
  group.add(instancedChunks(headGeo, headMat, lamps, false));
  if (glow.lamps > 0) {
    const pool = keep(
      new THREE.CircleGeometry(7, 28).rotateX(-Math.PI / 2).translate(2.2, 0.08 - SIDEWALK_Y, 0),
    );
    const poolMat = keep(
      new THREE.MeshBasicMaterial({
        map: keep(glowTexture()),
        color: '#ffcf8a',
        transparent: true,
        opacity: Math.min(0.55, glow.lamps * 0.22),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(instancedChunks(pool, poolMat, lamps, false));
  }
}

/** Trees scattered over the parks, on open grass. */
function parkTrees(map: CityMap): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  map.areas.forEach((a, ai) => {
    if (a.kind !== 'park' && a.kind !== 'cemetery') return;
    const w = a.bounds.maxX - a.bounds.minX;
    const d = a.bounds.maxZ - a.bounds.minZ;
    const want = Math.min(PARK_TREES_MAX, Math.floor((w * d) / PARK_M2_PER_TREE));
    for (let k = 0, n = 0; k < want * 3 && n < want; k++) {
      const x = a.bounds.minX + hash(ai, k) * w;
      const z = a.bounds.minZ + hash(k, ai + 0.5) * d;
      if (!insidePolygon(a.ring, x, z) || citySurfaceAt(map, x, z) !== 'grass') continue;
      out.push(matrix(x, 0.02, z, hash(x, z) * 6, 1, 0.8 + hash(z) * 0.6, 1));
      n++;
    }
  });
  return out;
}

export function addTrees(kit: Kit, map: CityMap): void {
  const { group, keep, mat } = kit;
  // Street trees on wide sidewalks, and the parks.
  const trees: THREE.Matrix4[] = parkTrees(map);
  alongEdges(
    map,
    (e) => e.sidewalkM >= 3,
    TREE_EVERY_M,
    (e) => e.sidewalkM - 0.9,
    TREE_EVERY_M / 2,
    (x, z, yaw) => {
      const h = hash(x, z);
      if (h < 0.3) return;
      trees.push(matrix(x, SIDEWALK_Y, z, yaw + h * 6, 1, 0.75 + h * 0.5, 1));
    },
  );
  const trunk = keep(new THREE.CylinderGeometry(0.12, 0.2, 3.6, 9).translate(0, 1.8, 0));
  const bark = mat({ color: '#5a4636', roughness: 0.95 });
  const leaves = mat({ map: keep(leafTexture(kit.anisotropy)), roughness: 0.85 });
  const tint = (i: number) =>
    new THREE.Color().setHSL(
      0.25 + hash(i) * 0.07,
      0.4 + hash(i, 2) * 0.2,
      0.5 + hash(i, 3) * 0.15,
    );
  group.add(
    instancedChunks(trunk, bark, trees),
    instancedChunks(keep(crownGeometry()), leaves, trees, true, tint),
  );
}

/**
 * A leafy crown: several overlapping clumps whose surfaces are pushed in and
 * out by a smooth noise, so the silhouette is ragged rather than a ball.
 */
function crownGeometry(): THREE.BufferGeometry {
  const clumps: [number, number, number, number][] = [
    [0, 4.4, 0, 2.3],
    [1.1, 5.4, 0.4, 1.6],
    [-1.0, 5.2, -0.7, 1.7],
  ];
  const parts = clumps.map(([x, y, z, r], k) => {
    const g = new THREE.IcosahedronGeometry(r, 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = v.clone().normalize();
      const bump =
        Math.sin(n.x * 5.1 + k) * Math.sin(n.y * 4.3 + k * 2) * Math.sin(n.z * 4.7 + k * 3);
      v.multiplyScalar(1 + 0.2 * bump + 0.06 * Math.sin(n.x * 17 + n.z * 13));
      p.setXYZ(i, v.x, v.y * 0.85, v.z);
    }
    g.computeVertexNormals();
    return g.translate(x, y, z);
  });
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return merged;
}

/** Dappled leaf texture so crowns read as foliage, not plastic. */
function leafTexture(anisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = '#4f7a35';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const l = 25 + hash(i) * 40;
    ctx.fillStyle = `hsl(${85 + hash(i, 1) * 40} 45% ${l}%)`;
    ctx.beginPath();
    ctx.ellipse(
      hash(i, 2) * 512,
      hash(i, 3) * 512,
      3 + hash(i, 4) * 5,
      2 + hash(i, 5) * 3,
      hash(i, 6) * 6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}

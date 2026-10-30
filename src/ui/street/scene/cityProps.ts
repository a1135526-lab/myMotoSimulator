import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { TimeOfDay } from '@/application';
import type { CityMap } from '@/domain';
import { signTexture } from './cityTextures';
import { alongRoads, hash, instanced, instancedChunks, KERB_M, matrix } from './roadLayout';

/** Street furniture and scenery, all instanced: lamps, trees, signals, signs, roof kit, hills. */

const LAMP_EVERY_M = 32;
const TREE_EVERY_M = 20;
const SIGNAL_CYCLE_S = 30;

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

export function addStreetLights(kit: Kit, map: CityMap): void {
  const { group, keep, mat, glow } = kit;
  // Street lights along every kerb, with pools of light at night.
  const lamps: THREE.Matrix4[] = [];
  alongRoads(map, LAMP_EVERY_M, 0.9, 0, (x, z, yaw) => lamps.push(matrix(x, KERB_M, z, yaw)));
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
      new THREE.CircleGeometry(7, 28).rotateX(-Math.PI / 2).translate(2.2, 0.03 - KERB_M, 0),
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

export function addTrees(kit: Kit, map: CityMap, parkTrees: readonly THREE.Matrix4[]): void {
  const { group, keep, mat } = kit;
  // Street trees between the lamps, and the parks.
  const trees: THREE.Matrix4[] = [...parkTrees];
  alongRoads(map, TREE_EVERY_M, 2.4, TREE_EVERY_M / 2, (x, z, yaw, road) => {
    if (road.kind === 'expressway') return;
    const h = hash(x, z);
    if (h < 0.35) return;
    trees.push(matrix(x, KERB_M, z, yaw + h * 6, 1, 0.75 + h * 0.5, 1));
  });
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

/** Traffic signals; returns the per-frame updater that cycles them. */
export function addSignals(kit: Kit, map: CityMap): (clockS: number) => void {
  const { group, keep, mat } = kit;
  // Traffic signals where avenues meet, one per approach on its near-right corner.
  const signals: { m: THREE.Matrix4; axis: 'x' | 'z' }[] = [];
  for (const a of map.roads.filter((r) => r.axis === 'x' && r.kind !== 'expressway')) {
    for (const b of map.roads.filter((r) => r.axis === 'z')) {
      if (a.kind !== 'avenue' && b.kind !== 'avenue') continue;
      const ex = b.widthM / 2 + 1;
      const ez = a.widthM / 2 + 1;
      // Lamps face the head's local −x. Eastbound traffic (south half) sees a
      // signal on the south-west corner facing west; the others likewise.
      signals.push({ m: matrix(b.centre - ex, KERB_M, a.centre + ez, 0), axis: 'x' });
      signals.push({ m: matrix(b.centre + ex, KERB_M, a.centre - ez, Math.PI), axis: 'x' });
      signals.push({ m: matrix(b.centre - ex, KERB_M, a.centre - ez, -Math.PI / 2), axis: 'z' });
      signals.push({ m: matrix(b.centre + ex, KERB_M, a.centre + ez, Math.PI / 2), axis: 'z' });
    }
  }
  const sigPole = keep(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8).translate(0, 2.6, 0));
  const sigHead = keep(new THREE.BoxGeometry(0.3, 1.15, 0.42).translate(0, 4.7, 0));
  const darkMetal = mat({ color: '#2b2e33', roughness: 0.55, metalness: 0.4 });
  const sm = signals.map((s) => s.m);
  group.add(instanced(sigPole, darkMetal, sm), instanced(sigHead, darkMetal, sm, false));
  const lampGeo = (y: number) =>
    keep(new THREE.CircleGeometry(0.13, 16).rotateY(-Math.PI / 2).translate(-0.16, y, 0));
  const lights = (['#ff2a1f', '#ffb000', '#22e06b'] as const).map((color, k) => {
    const mesh = instanced(
      lampGeo(5.08 - k * 0.37),
      keep(new THREE.MeshBasicMaterial({ color: '#ffffff' })),
      sm,
      false,
    );
    return { mesh, on: new THREE.Color(color), off: new THREE.Color(color).multiplyScalar(0.12) };
  });
  group.add(...lights.map((l) => l.mesh));

  let phase = -1;
  return (clockS) => {
    const t = clockS % SIGNAL_CYCLE_S;
    const next = t < 12 ? 0 : t < 15 ? 1 : t < 27 ? 2 : 3;
    if (next === phase) return;
    phase = next;
    // 0: x green · 1: x amber · 2: z green · 3: z amber
    signals.forEach((s, i) => {
      const go = s.axis === 'x' ? phase <= 1 : phase >= 2;
      const amber = phase === 1 || phase === 3;
      const state = !go ? 0 : amber ? 1 : 2;
      lights.forEach((l, k) => l.mesh.setColorAt(i, k === state ? l.on : l.off));
    });
    for (const l of lights) if (l.mesh.instanceColor) l.mesh.instanceColor.needsUpdate = true;
  };
}

export function addHills(kit: Kit, map: CityMap): void {
  const { group, keep, mat } = kit;
  // Distant hills to close the horizon (they fade into the fog).
  const hills: THREE.Matrix4[] = [];
  for (let k = 0; k < 26; k++) {
    const a = Math.PI * (1.05 + (k / 25) * 0.9) + (hash(k) - 0.5) * 0.1;
    const r = 2300 + hash(k, 1) * 900;
    const s = 380 + hash(k, 2) * 420;
    hills.push(
      matrix(
        map.width / 2 + Math.cos(a) * r,
        -40,
        map.depth / 3 + Math.sin(a) * r,
        0,
        s,
        s * (0.3 + hash(k, 3) * 0.25),
        s,
      ),
    );
  }
  group.add(
    instanced(
      keep(new THREE.IcosahedronGeometry(1, 3)),
      mat({ color: '#3d5a3a', roughness: 1 }),
      hills,
      false,
    ),
  );
}

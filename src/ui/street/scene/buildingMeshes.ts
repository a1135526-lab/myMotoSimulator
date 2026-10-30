import * as THREE from 'three';
import type { Building, CityMap } from '@/domain';
import type { ChunkedBuilders } from './chunks';
import { SIGN_TEXTS } from './cityTextures';
import { FACADE_TILE_M, type FacadeStyle } from './facadeTextures';
import type { P2 } from './geometryBuilder';
import { hash, matrix } from './roadLayout';

/**
 * Buildings: facade walls by style, flat roofs, and the street-level look of
 * a Taiwanese town — a tin or concrete canopy (雨遮) over the shop front and
 * upright shop signs hanging off it. Roof kit is returned as instance lists.
 */

export type BuildingPart = FacadeStyle | 'roof' | 'canopy';

const GROUND_Y = 0;
const CANOPY_Y = 3.3;
const CANOPY_DEPTH_M = 1.3;

const TINTS: Readonly<Record<FacadeStyle, readonly string[]>> = {
  glass: ['#cfe3ea', '#b7d3c9', '#d8cdb8', '#c4ccd8'],
  office: ['#ffffff', '#e6ded2', '#d4d8dc', '#efe6d8'],
  apartment: ['#ffffff', '#f3e1cf', '#e3e8e2', '#f2d9d3', '#e9e1c8', '#d9dde4', '#e8d4bd'],
  industrial: ['#ffffff', '#d6e2ea', '#e6e6e0', '#cfd8cf'],
};
const CANOPY_TINTS = ['#9fb3c4', '#5c8db8', '#7aa37a', '#d0d0cc', '#c9a46b', '#8e9aa6'];

function facadeFor(b: Building): FacadeStyle {
  switch (b.style) {
    case 'tower':
      return b.look < 0.55 ? 'glass' : 'office';
    case 'shophouse':
      return b.look < 0.6 ? 'apartment' : 'office';
    case 'factory':
      return 'industrial';
    case 'mapped':
      return b.heightM > 26 ? 'office' : 'apartment';
    default:
      return 'apartment';
  }
}

export interface RoofKit {
  readonly tanks: THREE.Matrix4[];
  readonly units: THREE.Matrix4[];
  /** One list of sign placements per SIGN_TEXTS entry. */
  readonly signs: THREE.Matrix4[][];
}

const centroid = (ring: readonly P2[]) => ({
  x: ring.reduce((s, p) => s + p.x, 0) / ring.length,
  z: ring.reduce((s, p) => s + p.z, 0) / ring.length,
});

/** Canopy and signs along the street front of a shop-house row. */
function shopFront(
  parts: ChunkedBuilders<BuildingPart>,
  kit: RoofKit,
  b: Building,
  index: number,
  c: P2,
) {
  const a = b.ring[b.front] as P2;
  const z = b.ring[(b.front + 1) % b.ring.length] as P2;
  const len = Math.hypot(z.x - a.x, z.z - a.z);
  if (len < 4) return;
  // Outward normal: away from the building's middle.
  let nx = -(z.z - a.z) / len;
  let nz = (z.x - a.x) / len;
  const mx = (a.x + z.x) / 2;
  const mz = (a.z + z.z) / 2;
  if (nx * (mx - c.x) + nz * (mz - c.z) < 0) [nx, nz] = [-nx, -nz];
  const d = CANOPY_DEPTH_M;
  const out = (p: P2) => ({ x: p.x + nx * d, z: p.z + nz * d });
  const tint = new THREE.Color(
    CANOPY_TINTS[Math.floor(hash(index, 3) * CANOPY_TINTS.length)] ?? '#999',
  );
  const canopy = parts.at('canopy', mx, mz);
  // Wind so it faces up (clockwise in x/z).
  const quad = [a, z, out(z), out(a)];
  const cross = (z.x - a.x) * (out(z).z - a.z) - (z.z - a.z) * (out(z).x - a.x);
  const [q0, q1, q2, q3] = cross > 0 ? [quad[0], quad[3], quad[2], quad[1]] : quad;
  canopy.flatQuad(q0 as P2, q1 as P2, q2 as P2, q3 as P2, CANOPY_Y, 2, tint);
  const oa = out(a);
  const oz = out(z);
  // Fascia facing the street.
  const facing = nx * -(oz.z - oa.z) + nz * (oz.x - oa.x) > 0;
  if (facing) canopy.wall(oa.x, oa.z, oz.x, oz.z, CANOPY_Y - 0.35, CANOPY_Y, 2, 1, 0, tint);
  else canopy.wall(oz.x, oz.z, oa.x, oa.z, CANOPY_Y - 0.35, CANOPY_Y, 2, 1, 0, tint);

  const count = Math.min(4, Math.floor(len / 5));
  for (let k = 0; k < count; k++) {
    if (hash(index * 7 + k, 11) > 0.6) continue;
    const t = (k + 0.5) / count;
    const sx = a.x + (z.x - a.x) * t + nx * (d + 0.05);
    const sz = a.z + (z.z - a.z) * t + nz * (d + 0.05);
    const kind = Math.floor(hash(index, k * 3 + 1) * SIGN_TEXTS.length);
    kit.signs[kind]?.push(
      matrix(sx, CANOPY_Y + 0.4 + hash(k, index) * 1.6, sz, Math.atan2(-nz, nx)),
    );
  }
}

export function buildBuildings(parts: ChunkedBuilders<BuildingPart>, map: CityMap): RoofKit {
  const kit: RoofKit = { tanks: [], units: [], signs: SIGN_TEXTS.map(() => []) };
  map.buildings.forEach((b, i) => {
    const style = facadeFor(b);
    const c = centroid(b.ring);
    const tile = FACADE_TILE_M[style];
    const tints = TINTS[style];
    const color = new THREE.Color(tints[Math.floor(b.look * tints.length)] ?? '#ffffff');
    parts
      .at(style, c.x, c.z)
      .ringWalls(b.ring, GROUND_Y, b.heightM, tile.w, tile.h, Math.floor(b.look * 7), color);
    parts.at('roof', c.x, c.z).polygon(b.ring, b.heightM, 6);

    const w = b.bounds.maxX - b.bounds.minX;
    const d = b.bounds.maxZ - b.bounds.minZ;
    if (b.style === 'townhouse' || b.style === 'shophouse') {
      for (let k = 0; k < 1 + Math.floor(b.look * 2); k++) {
        kit.tanks.push(
          matrix(
            c.x + (hash(i, k) - 0.5) * w * 0.4,
            b.heightM,
            c.z + (hash(k, i) - 0.5) * d * 0.4,
            0,
          ),
        );
      }
      if (b.front >= 0 && hash(i, 5) < 0.8) shopFront(parts, kit, b, i, c);
    } else if (Math.min(w, d) > 8) {
      kit.units.push(matrix(c.x, b.heightM, c.z, b.look * 3));
    }
  });
  return kit;
}

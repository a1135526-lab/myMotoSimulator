import * as THREE from 'three';
import type { TimeOfDay } from '@/application';
import type { Building, CityMap, District } from '@/domain';
import {
  addHills,
  addRoofKitAndSigns,
  addSignals,
  addStreetLights,
  addTrees,
  GLOW,
  type Kit,
} from './cityProps';
import {
  asphaltTexture,
  concreteTexture,
  grassTexture,
  paverTexture,
  roofTexture,
  SIGN_TEXTS,
} from './cityTextures';
import { FACADE_STYLES, FACADE_TILE_M, facadeTextures, type FacadeStyle } from './facadeTextures';
import { QuadBuilder } from './geometryBuilder';
import {
  blockSurfaces,
  GRASS_TILE_M,
  hash,
  KERB_M,
  markRoad,
  matrix,
  PAVER_TILE_M,
  roadSurfaces,
} from './roadLayout';

export { KERB_M };

export interface CityScene {
  readonly group: THREE.Group;
  /** Animate what changes over time (traffic signals). */
  update(clockS: number): void;
  dispose(): void;
}

function styleFor(district: District, look: number): FacadeStyle {
  switch (district) {
    case 'downtown':
      return look < 0.6 ? 'glass' : 'office';
    case 'commercial':
      return look < 0.4 ? 'office' : 'apartment';
    case 'industrial':
      return 'industrial';
    case 'waterfront':
      return look < 0.5 ? 'office' : 'apartment';
    default:
      return 'apartment';
  }
}

const TINTS: Readonly<Record<FacadeStyle, readonly string[]>> = {
  glass: ['#cfe3ea', '#b7d3c9', '#d8cdb8', '#c4ccd8'],
  office: ['#ffffff', '#e6ded2', '#d4d8dc', '#efe6d8'],
  apartment: ['#ffffff', '#f3e1cf', '#e3e8e2', '#f2d9d3', '#e9e1c8', '#d9dde4'],
  industrial: ['#ffffff', '#d6e2ea', '#e6e6e0', '#cfd8cf'],
};

function buildingFaces(
  building: Building,
  style: FacadeStyle,
  walls: QuadBuilder,
  roofs: QuadBuilder,
) {
  const { x0, z0, x1, z1 } = building.rect;
  const top = KERB_M + building.heightM;
  const tile = FACADE_TILE_M[style];
  const tints = TINTS[style];
  const color = new THREE.Color(tints[Math.floor(building.look * tints.length)] ?? '#ffffff');
  const u = Math.floor(building.look * 7);
  walls.wall(x0, z1, x1, z1, KERB_M, top, tile.w, tile.h, u, color);
  walls.wall(x1, z0, x0, z0, KERB_M, top, tile.w, tile.h, u, color);
  walls.wall(x1, z1, x1, z0, KERB_M, top, tile.w, tile.h, u, color);
  walls.wall(x0, z0, x0, z1, KERB_M, top, tile.w, tile.h, u, color);
  roofs.floor(x0, z0, x1, z1, top, 6);
}

export function buildCityScene(map: CityMap, time: TimeOfDay, anisotropy: number): CityScene {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const o = { anisotropy };
  const glow = GLOW[time];
  const mat = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  const kit: Kit = { group, glow, anisotropy, keep, mat };
  const asphaltMap = keep(asphaltTexture(o));
  const asphaltMat = mat({ map: asphaltMap, roughness: 0.93 });
  const paverMat = mat({ map: keep(paverTexture(o)), roughness: 0.85 });
  const concreteMat = mat({ map: keep(concreteTexture(o)), roughness: 0.9 });
  const grassMap = keep(grassTexture(o));
  const grassMat = mat({ map: grassMap, roughness: 1 });
  const roofMat = mat({ map: keep(roofTexture(o)), roughness: 0.9 });
  const markWhite = mat({
    color: '#ecebe4',
    roughness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const markYellow = mat({
    color: '#f2b705',
    roughness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const addMesh = (
    b: QuadBuilder,
    m: THREE.Material,
    shadows: { cast: boolean; receive: boolean },
  ) => {
    if (b.empty) return;
    const mesh = new THREE.Mesh(keep(b.build()), m);
    mesh.castShadow = shadows.cast;
    mesh.receiveShadow = shadows.receive;
    group.add(mesh);
  };
  const flat = { cast: false, receive: true };
  const solid = { cast: true, receive: true };

  // Ground: grass everywhere on land, water beyond the shore.
  const ground = new QuadBuilder();
  ground.floor(-3000, -3000, map.width + 3000, map.shoreZ, -0.02, GRASS_TILE_M * 2);
  addMesh(ground, grassMat, flat);
  const sea = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(map.width + 8000, 6000)),
    mat({ color: '#1f4f66', roughness: 0.08, metalness: 0.65 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(map.width / 2, -0.6, map.shoreZ + 3000);
  group.add(sea);
  const seawall = new QuadBuilder();
  seawall.box(-3000, map.shoreZ - 1.5, map.width + 3000, map.shoreZ, -0.8, 0.35, 2);
  addMesh(seawall, concreteMat, solid);

  // Roads and markings
  const asphalt = new QuadBuilder();
  roadSurfaces(map, asphalt);
  addMesh(asphalt, asphaltMat, flat);
  const white = new QuadBuilder();
  const yellow = new QuadBuilder();
  for (const road of map.roads) markRoad(map, road, white, yellow);
  addMesh(white, markWhite, flat);
  addMesh(yellow, markYellow, flat);

  // Promenade walkway along the expressway.
  const express = map.roads.find((r) => r.kind === 'expressway');
  const pavers = new QuadBuilder();
  const curbs = new QuadBuilder();
  const parkGrass = new QuadBuilder();
  const yard = new QuadBuilder();
  if (express) {
    pavers.floor(0, express.rect.z0 - 7, map.width, express.rect.z0 - 1, KERB_M, PAVER_TILE_M);
    curbs.wall(map.width, express.rect.z0 - 1, 0, express.rect.z0 - 1, 0, KERB_M, 2, 1);
  }

  // Blocks and buildings
  const walls = new Map<FacadeStyle, QuadBuilder>(FACADE_STYLES.map((s) => [s, new QuadBuilder()]));
  const roofs = new QuadBuilder();
  const tanks: THREE.Matrix4[] = [];
  const units: THREE.Matrix4[] = [];
  const signs: THREE.Matrix4[][] = SIGN_TEXTS.map(() => []);
  const parkTrees: THREE.Matrix4[] = [];

  map.blocks.forEach((block, bi) => {
    blockSurfaces(block, pavers, curbs, parkGrass, yard);
    if (block.district === 'park') {
      const l = block.lot;
      for (let k = 0; k < 34; k++) {
        const x = l.x0 + 4 + hash(bi, k) * (l.x1 - l.x0 - 8);
        const z = l.z0 + 4 + hash(k, bi) * (l.z1 - l.z0 - 8);
        const onPath = Math.abs(x - (l.x0 + l.x1) / 2) < 4 || Math.abs(z - (l.z0 + l.z1) / 2) < 4;
        if (!onPath)
          parkTrees.push(matrix(x, KERB_M, z, hash(x, z) * 6, 1, 0.8 + hash(z) * 0.6, 1));
      }
    }
    block.buildings.forEach((b, i) => {
      const style = styleFor(block.district, b.look);
      buildingFaces(b, style, walls.get(style) as QuadBuilder, roofs);
      const top = KERB_M + b.heightM;
      const cx = (b.rect.x0 + b.rect.x1) / 2;
      const cz = (b.rect.z0 + b.rect.z1) / 2;
      const w = b.rect.x1 - b.rect.x0;
      const d = b.rect.z1 - b.rect.z0;
      if (style === 'apartment' && b.heightM < 32) {
        for (let k = 0; k < 1 + Math.floor(b.look * 3); k++) {
          tanks.push(
            matrix(cx + (hash(i, k) - 0.5) * (w - 4), top, cz + (hash(k, i) - 0.5) * (d - 4), 0),
          );
        }
      } else {
        units.push(matrix(cx + (b.look - 0.5) * (w - 6), top, cz, b.look * 3));
      }
      // Perpendicular shop signs over the pavement, the way Taiwanese streets look.
      if (style === 'apartment' && b.heightM > 7) {
        const faces = [
          { on: Math.abs(b.rect.z0 - block.lot.z0) < 0.5, n: [0, -1] as const },
          { on: Math.abs(b.rect.z1 - block.lot.z1) < 0.5, n: [0, 1] as const },
          { on: Math.abs(b.rect.x0 - block.lot.x0) < 0.5, n: [-1, 0] as const },
          { on: Math.abs(b.rect.x1 - block.lot.x1) < 0.5, n: [1, 0] as const },
        ];
        for (const f of faces) {
          if (!f.on) continue;
          const [nx, nz] = f.n;
          const len = nx === 0 ? w : d;
          const count = Math.min(3, Math.floor(len / 6));
          for (let k = 0; k < count; k++) {
            if (hash(i * 7 + k, bi) > 0.65) continue;
            const t = (k + 0.5) / count - 0.5;
            const fx = nx === 0 ? cx + t * w : nx > 0 ? b.rect.x1 : b.rect.x0;
            const fz = nz === 0 ? cz + t * d : nz > 0 ? b.rect.z1 : b.rect.z0;
            const kind = Math.floor(hash(bi, i * 3 + k) * SIGN_TEXTS.length);
            signs[kind]?.push(
              matrix(
                fx + nx * 0.05,
                KERB_M + 3.4 + hash(k, i) * 2,
                fz + nz * 0.05,
                Math.atan2(-nz, nx),
              ),
            );
          }
        }
      }
    });
  });
  addMesh(pavers, paverMat, flat);
  addMesh(curbs, concreteMat, flat);
  addMesh(parkGrass, grassMat, flat);
  addMesh(yard, asphaltMat, flat);
  addMesh(roofs, roofMat, solid);

  for (const style of FACADE_STYLES) {
    const tex = facadeTextures(style, o);
    keep(tex.map);
    keep(tex.emissive);
    const m = mat({
      map: tex.map,
      emissiveMap: tex.emissive,
      emissive: '#ffffff',
      emissiveIntensity: glow.windows,
      vertexColors: true,
      roughness: style === 'glass' ? 0.12 : 0.85,
      metalness: style === 'glass' ? 0.75 : 0.02,
    });
    addMesh(walls.get(style) as QuadBuilder, m, solid);
  }

  addRoofKitAndSigns(kit, tanks, units, signs);
  addStreetLights(kit, map);
  addTrees(kit, map, parkTrees);
  addHills(kit, map);
  const updateSignals = addSignals(kit, map);

  return {
    group,
    update: updateSignals,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

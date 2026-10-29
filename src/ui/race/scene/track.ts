import * as THREE from 'three';
import {
  asphaltTexture,
  bannerTexture,
  checkerTexture,
  crowdTexture,
  grassTexture,
  labelTexture,
} from './textures';

/**
 * Straight drag strip along −Z. Start line at z = 0, finish at z = −distance.
 * Two lanes centred on x = ±LANE_OFFSET.
 */
export const LANE_WIDTH = 3.6;
export const LANE_OFFSET = LANE_WIDTH / 2;
const ROAD_WIDTH = LANE_WIDTH * 2 + 2;
const RUN_UP_M = 40;
const RUN_OFF_M = 500;
const DASH_EVERY_M = 12;
const POLE_EVERY_M = 40;
const BOARD_EVERY_M = 100;

const z = (meters: number) => -meters;

function plane(w: number, l: number, material: THREE.Material, x: number, centerM: number, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, l), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z(centerM));
  return mesh;
}

/** One InstancedMesh for many identical objects placed along the strip. */
function along(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  spots: { x: number; y: number; m: number }[],
) {
  const mesh = new THREE.InstancedMesh(geometry, material, spots.length);
  const m = new THREE.Matrix4();
  spots.forEach((s, i) => mesh.setMatrixAt(i, m.makeTranslation(s.x, s.y, z(s.m))));
  return mesh;
}

function grandstand(side: -1 | 1, fromM: number, lengthM: number, crowd: THREE.Material) {
  const group = new THREE.Group();
  const x = side * (ROAD_WIDTH / 2 + 9);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(8, 5, lengthM),
    new THREE.MeshLambertMaterial({ color: '#4a4f5a' }),
  );
  body.position.set(x, 2.5, z(fromM + lengthM / 2));
  const faceTex = (crowd as THREE.MeshLambertMaterial).map;
  if (faceTex) faceTex.repeat.set(lengthM / 4, 1);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(lengthM, 4.5), crowd);
  face.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  face.rotation.x = 0;
  face.position.set(x - side * 4.01, 2.6, z(fromM + lengthM / 2));
  group.add(body, face);
  return group;
}

function finishGantry(distanceM: number) {
  const group = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: '#d9d9d9' });
  const half = ROAD_WIDTH / 2 + 0.6;
  for (const x of [-half, half]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), postMat);
    post.position.set(x, 3.5, z(distanceM));
    group.add(post);
  }
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2, 1.4),
    new THREE.MeshBasicMaterial({ map: bannerTexture('FINISH'), side: THREE.DoubleSide }),
  );
  banner.position.set(0, 6.4, z(distanceM));
  group.add(banner);
  return group;
}

export type SceneryKind = 'stadium' | 'coast' | 'mountain';

/** Glowing lamp heads on every light pole (night tracks). */
function lamps(poles: { x: number; y: number; m: number }[]) {
  const heads = poles.map((p) => ({ x: p.x * 0.88, y: 6.1, m: p.m }));
  const group = new THREE.Group();
  group.add(
    along(
      new THREE.SphereGeometry(0.25, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#ffe6a3' }),
      heads,
    ),
  );
  // Pools of light on the road under each lamp.
  // No pools at the start line: they would sit right under the rider's view.
  const pools = heads.filter((h) => h.m > 20).map((h) => ({ x: h.x * 0.6, y: 0.02, m: h.m }));
  const pool = new THREE.CircleGeometry(4, 16).rotateX(-Math.PI / 2);
  group.add(
    along(
      pool,
      new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.08 }),
      pools,
    ),
  );
  return group;
}

/** Roadside surroundings for each venue type. */
function scenery(kind: SceneryKind, distanceM: number, total: number, centerM: number) {
  const group = new THREE.Group();
  if (kind === 'stadium') {
    const crowd = new THREE.MeshLambertMaterial({ map: crowdTexture() });
    for (const side of [-1, 1] as const) {
      group.add(grandstand(side, -10, Math.min(160, distanceM * 0.6), crowd));
      if (distanceM > 300) group.add(grandstand(side, distanceM - 80, 120, crowd));
    }
    return group;
  }
  const hillMat = new THREE.MeshLambertMaterial({
    color: kind === 'mountain' ? '#2f4a2a' : '#6b5d4a',
  });
  const hills: { x: number; y: number; m: number }[] = [];
  for (let m = -40; m < total; m += kind === 'mountain' ? 35 : 60) {
    const spread = 30 + ((m * 7919) % 40);
    hills.push({ x: -(ROAD_WIDTH / 2 + spread), y: 0, m });
    if (kind === 'mountain') hills.push({ x: ROAD_WIDTH / 2 + spread, y: 0, m: m + 17 });
  }
  const cone = new THREE.ConeGeometry(
    kind === 'mountain' ? 22 : 12,
    kind === 'mountain' ? 40 : 10,
    7,
  ).translate(0, kind === 'mountain' ? 20 : 5, 0);
  group.add(along(cone, hillMat, hills));
  if (kind === 'coast') {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(600, total + 400),
      new THREE.MeshLambertMaterial({ color: '#1d4e6f' }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(ROAD_WIDTH / 2 + 310, -0.01, z(centerM));
    group.add(sea);
  }
  return group;
}

export interface TrackObjects {
  readonly group: THREE.Group;
  dispose(): void;
}

export interface TrackOptions {
  readonly scenery: SceneryKind;
  readonly night: boolean;
}

export function buildTrack(distanceM: number, opts: TrackOptions): TrackObjects {
  const group = new THREE.Group();
  const total = RUN_UP_M + distanceM + RUN_OFF_M;
  const centerM = distanceM / 2 + (RUN_OFF_M - RUN_UP_M) / 2;

  const asphalt = asphaltTexture();
  asphalt.repeat.set(ROAD_WIDTH / 4, total / 4);
  const grass = grassTexture();
  grass.repeat.set(200 / 4, total / 4);
  group.add(plane(200, total, new THREE.MeshLambertMaterial({ map: grass }), 0, centerM, -0.02));
  group.add(plane(ROAD_WIDTH, total, new THREE.MeshLambertMaterial({ map: asphalt }), 0, centerM));

  const white = new THREE.MeshBasicMaterial({ color: '#e8e8e8' });
  for (const x of [-LANE_WIDTH, LANE_WIDTH]) group.add(plane(0.15, total, white, x, centerM, 0.01));

  const dashes: { x: number; y: number; m: number }[] = [];
  for (let m = -RUN_UP_M; m < distanceM + RUN_OFF_M; m += DASH_EVERY_M)
    dashes.push({ x: 0, y: 0.012, m });
  const dash = new THREE.PlaneGeometry(0.15, 4).rotateX(-Math.PI / 2);
  group.add(along(dash, white, dashes));

  const lines = [
    { m: 0, mat: white },
    { m: distanceM, mat: new THREE.MeshBasicMaterial({ map: checkerTexture() }) },
  ];
  for (const { m, mat } of lines) group.add(plane(LANE_WIDTH * 2, 1.2, mat, 0, m, 0.015));

  const poles: { x: number; y: number; m: number }[] = [];
  const edge = ROAD_WIDTH / 2 + 1.2;
  for (let m = 0; m < distanceM + RUN_OFF_M; m += POLE_EVERY_M) {
    poles.push({ x: -edge, y: 3, m }, { x: edge, y: 3, m });
  }
  group.add(
    along(
      new THREE.CylinderGeometry(0.08, 0.1, 6, 6),
      new THREE.MeshLambertMaterial({ color: '#9aa0a6' }),
      poles,
    ),
  );

  const wallMat = new THREE.MeshLambertMaterial({ color: '#c9ccd1' });
  for (const side of [-1, 1] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, total), wallMat);
    wall.position.set(side * (ROAD_WIDTH / 2 + 0.3), 0.45, z(centerM));
    group.add(wall);
  }

  for (let m = BOARD_EVERY_M; m < distanceM; m += BOARD_EVERY_M) {
    for (const side of [-1, 1]) {
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1),
        new THREE.MeshBasicMaterial({ map: labelTexture(`${m}m`), side: THREE.DoubleSide }),
      );
      board.position.set(side * (ROAD_WIDTH / 2 + 1.5), 2.2, z(m));
      group.add(board);
    }
  }

  if (opts.night) group.add(lamps(poles));
  group.add(scenery(opts.scenery, distanceM, total, centerM));
  group.add(finishGantry(distanceM));

  return {
    group,
    dispose: () =>
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            (mat as THREE.MeshBasicMaterial).map?.dispose();
            mat.dispose();
          }
        }
      }),
  };
}

import * as THREE from 'three';
import type { TimeOfDay } from '@/application';
import type { CityMap } from '@/domain';
import { buildBuildings, type BuildingPart } from './buildingMeshes';
import { ChunkedBuilders } from './chunks';
import { addHills, addLandmarkLabels, addSignals } from './cityMarkers';
import { addRoofKitAndSigns, addStreetLights, addTrees, GLOW, type Kit } from './cityProps';
import {
  asphaltTexture,
  concreteTexture,
  grassTexture,
  paverTexture,
  roofTexture,
} from './cityTextures';
import { FACADE_STYLES, facadeTextures, type FacadeStyle } from './facadeTextures';
import { QuadBuilder } from './geometryBuilder';
import { buildLand, type LandPart } from './landMeshes';
import { buildRoads, ROAD_Y, type RoadPart } from './roadMeshes';

/** Height the bike rides at on tarmac. */
export { ROAD_Y };

export interface CityScene {
  readonly group: THREE.Group;
  /** Animate what changes over time (traffic signals). */
  update(clockS: number): void;
  dispose(): void;
}

const flat = { cast: false, receive: true };
const solid = { cast: true, receive: true };
const MARK = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } as const;
/** Ground beyond the mapped area, so the horizon isn't a cliff. */
const GROUND_PAD_M = 4000;

export function buildCityScene(map: CityMap, time: TimeOfDay, anisotropy: number): CityScene {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const o = { anisotropy };
  const glow = GLOW[time];
  const mat = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  const kit: Kit = { group, glow, anisotropy, keep, mat };

  const asphalt = keep(asphaltTexture(o));
  const concrete = keep(concreteTexture(o));
  const grass = keep(grassTexture(o));
  const paver = keep(paverTexture(o));

  // Open ground: dusty concrete lots, as between Taiwanese buildings.
  const ground = new QuadBuilder();
  const b = map.bounds;
  ground.floor(
    b.minX - GROUND_PAD_M,
    b.minZ - GROUND_PAD_M,
    b.maxX + GROUND_PAD_M,
    b.maxZ + GROUND_PAD_M,
    0,
    10,
  );
  const groundMesh = new THREE.Mesh(
    keep(ground.build()),
    mat({ map: concrete, color: '#b9b2a4', roughness: 0.95 }),
  );
  groupMesh(group, groundMesh, flat);

  const land = new ChunkedBuilders<LandPart>();
  buildLand(land, map);
  const landMats: Record<LandPart, THREE.Material> = {
    grass: mat({ map: grass, roughness: 1 }),
    water: mat({ color: '#2a5a6e', roughness: 0.1, metalness: 0.55 }),
    yard: mat({ map: asphalt, color: '#a8a8a8', roughness: 0.95 }),
    school: mat({ map: paver, color: '#d8c8b8', roughness: 0.9 }),
    bank: mat({ map: concrete, roughness: 0.9 }),
  };
  land.build(
    group,
    (k) => landMats[k],
    () => flat,
    keep,
  );

  const roads = new ChunkedBuilders<RoadPart>();
  buildRoads(roads, map);
  const roadMats: Record<RoadPart, THREE.Material> = {
    asphalt: mat({ map: asphalt, roughness: 0.93 }),
    white: mat({ color: '#ecebe4', roughness: 0.65, ...MARK }),
    yellow: mat({ color: '#f2b705', roughness: 0.65, ...MARK }),
    paver: mat({ map: paver, roughness: 0.85 }),
    kerb: mat({ map: concrete, roughness: 0.9 }),
  };
  roads.build(
    group,
    (k) => roadMats[k],
    (k) => (k === 'kerb' ? solid : flat),
    keep,
  );

  const houses = new ChunkedBuilders<BuildingPart>();
  const roofKit = buildBuildings(houses, map);
  const facades = new Map<FacadeStyle, THREE.Material>(
    FACADE_STYLES.map((style) => {
      const tex = facadeTextures(style, o);
      keep(tex.map);
      keep(tex.emissive);
      return [
        style,
        mat({
          map: tex.map,
          emissiveMap: tex.emissive,
          emissive: '#ffffff',
          emissiveIntensity: glow.windows,
          vertexColors: true,
          roughness: style === 'glass' ? 0.12 : 0.85,
          metalness: style === 'glass' ? 0.75 : 0.02,
        }),
      ];
    }),
  );
  const roofMat = mat({ map: keep(roofTexture(o)), roughness: 0.9 });
  const canopyMat = mat({
    vertexColors: true,
    roughness: 0.6,
    metalness: 0.3,
    side: THREE.DoubleSide,
  });
  houses.build(
    group,
    (k) =>
      k === 'roof' ? roofMat : k === 'canopy' ? canopyMat : (facades.get(k) as THREE.Material),
    () => solid,
    keep,
  );

  addRoofKitAndSigns(kit, roofKit.tanks, roofKit.units, roofKit.signs);
  addStreetLights(kit, map);
  addTrees(kit, map);
  addHills(kit, map);
  addLandmarkLabels(kit, map);
  const updateSignals = addSignals(kit, map);

  return {
    group,
    update: updateSignals,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

function groupMesh(group: THREE.Group, mesh: THREE.Mesh, s: { cast: boolean; receive: boolean }) {
  mesh.castShadow = s.cast;
  mesh.receiveShadow = s.receive;
  group.add(mesh);
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StreetCarView } from '@/application';
import type { CarKind } from '@/domain';

/**
 * City traffic, drawn with instancing: per car type one mesh each for the
 * painted body, the glasshouse, the wheels and the lamps, so seventy cars
 * cost a handful of draw calls. Models face −Z like the bikes.
 */

interface Shape {
  readonly length: number;
  readonly width: number;
  readonly bodyH: number;
  readonly cabinH: number;
  /** Cabin length as a share of the car, and its offset toward the back. */
  readonly cabin: number;
  readonly cabinBack: number;
  readonly wheelR: number;
}

const SHAPES: Readonly<Record<CarKind, Shape>> = {
  sedan: {
    length: 4.6,
    width: 1.8,
    bodyH: 0.62,
    cabinH: 0.55,
    cabin: 0.5,
    cabinBack: 0.08,
    wheelR: 0.33,
  },
  hatch: {
    length: 3.9,
    width: 1.72,
    bodyH: 0.64,
    cabinH: 0.62,
    cabin: 0.6,
    cabinBack: 0.12,
    wheelR: 0.31,
  },
  van: {
    length: 5.0,
    width: 2.0,
    bodyH: 0.8,
    cabinH: 1.0,
    cabin: 0.82,
    cabinBack: 0.06,
    wheelR: 0.36,
  },
  bus: { length: 11, width: 2.5, bodyH: 1.2, cabinH: 1.5, cabin: 0.97, cabinBack: 0, wheelR: 0.5 },
};

const PAINTS = [
  '#f2f2f0',
  '#1c1d21',
  '#b8bcc2',
  '#8a1c1c',
  '#1f3d73',
  '#e3c46a',
  '#3f5f4a',
  '#6b6f75',
  '#f2f2f0',
  '#2a2a2e',
];
const BUS_PAINT = '#2e7d4f';
const RIDE_M = 0.18;

interface KindMeshes {
  readonly meshes: THREE.InstancedMesh[];
  readonly ids: number[];
}

function partsFor(s: Shape) {
  const lift = RIDE_M + s.wheelR * 0.6;
  const body = new RoundedBoxGeometry(s.width, s.bodyH, s.length, 4, 0.16).translate(
    0,
    lift + s.bodyH / 2,
    0,
  );
  const cabinLen = s.length * s.cabin;
  const glass = new RoundedBoxGeometry(s.width * 0.9, s.cabinH, cabinLen, 4, 0.2).translate(
    0,
    lift + s.bodyH + s.cabinH / 2 - 0.04,
    s.length * s.cabinBack,
  );
  const wheel = new THREE.CylinderGeometry(s.wheelR, s.wheelR, 0.24, 18).rotateZ(Math.PI / 2);
  const axle = s.length / 2 - s.wheelR - 0.45;
  const wheels = mergeGeometries(
    [-1, 1].flatMap((x) =>
      [-axle, axle].map((z) => wheel.clone().translate(x * (s.width / 2 - 0.14), s.wheelR, z)),
    ),
  );
  wheel.dispose();
  const lampY = lift + s.bodyH * 0.6;
  const head = mergeGeometries(
    [-1, 1].map((x) =>
      new THREE.BoxGeometry(0.42, 0.14, 0.06).translate(
        x * (s.width / 2 - 0.32),
        lampY,
        -s.length / 2 - 0.01,
      ),
    ),
  );
  const tail = mergeGeometries(
    [-1, 1].map((x) =>
      new THREE.BoxGeometry(0.38, 0.14, 0.06).translate(
        x * (s.width / 2 - 0.3),
        lampY,
        s.length / 2 + 0.01,
      ),
    ),
  );
  return { body, glass, wheels, head, tail };
}

export class CarFleet {
  readonly group = new THREE.Group();
  private readonly byKind = new Map<CarKind, KindMeshes>();
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly tmp = new THREE.Object3D();

  /** `night`: 0 (day) … 1 (night), how bright the lamps are. */
  constructor(cars: readonly StreetCarView[], night: number) {
    const paint = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.32,
      metalness: 0.55,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: '#1b2630',
      roughness: 0.05,
      metalness: 0.9,
    });
    const tyre = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.85 });
    const head = new THREE.MeshStandardMaterial({
      color: '#f4f4ee',
      emissive: '#fff4d6',
      emissiveIntensity: 0.2 + night * 2,
    });
    const tail = new THREE.MeshStandardMaterial({
      color: '#7a0d0d',
      emissive: '#ff1a1a',
      emissiveIntensity: 0.15 + night * 1.6,
    });
    this.materials.push(paint, glass, tyre, head, tail);

    for (const kind of Object.keys(SHAPES) as CarKind[]) {
      const ids = cars.filter((c) => c.kind === kind).map((c) => c.id);
      if (ids.length === 0) continue;
      const g = partsFor(SHAPES[kind]);
      this.geometries.push(g.body, g.glass, g.wheels, g.head, g.tail);
      const mesh = (geo: THREE.BufferGeometry, m: THREE.Material, shadow: boolean) => {
        const im = new THREE.InstancedMesh(geo, m, ids.length);
        im.castShadow = shadow;
        im.receiveShadow = shadow;
        im.frustumCulled = false;
        this.group.add(im);
        return im;
      };
      const body = mesh(g.body, paint, true);
      cars
        .filter((c) => c.kind === kind)
        .forEach((c, i) => {
          const color =
            kind === 'bus' ? BUS_PAINT : (PAINTS[Math.floor(c.paint * PAINTS.length)] ?? '#ffffff');
          body.setColorAt(i, new THREE.Color(color));
        });
      this.byKind.set(kind, {
        ids,
        meshes: [
          body,
          mesh(g.glass, glass, true),
          mesh(g.wheels, tyre, false),
          mesh(g.head, head, false),
          mesh(g.tail, tail, false),
        ],
      });
    }
  }

  update(cars: readonly StreetCarView[]): void {
    const byId = new Map(cars.map((c) => [c.id, c]));
    for (const { ids, meshes } of this.byKind.values()) {
      ids.forEach((id, i) => {
        const c = byId.get(id);
        if (!c) return;
        this.tmp.position.set(c.x, 0, c.z);
        // Face −Z along heading h (forward = cos h, sin h).
        this.tmp.rotation.set(0, Math.atan2(-Math.cos(c.heading), -Math.sin(c.heading)), 0);
        this.tmp.updateMatrix();
        for (const m of meshes) m.setMatrixAt(i, this.tmp.matrix);
      });
      for (const m of meshes) m.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}

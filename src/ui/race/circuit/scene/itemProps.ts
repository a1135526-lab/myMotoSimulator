import * as THREE from 'three';
import type { ItemView } from '@/application';
import { labelTexture } from '../../scene/textures';

/** Ground height at a point. */
type GroundAt = (x: number, z: number) => number;

const BOX_SIZE = 1.1;
const BOX_FLOAT_M = 1.0;
const SPIN_PER_S = 1.6;

/** Low-poly, shared materials: CI renders with software WebGL. */
function trapMesh(kind: 'oil' | 'tacks' | 'cone'): THREE.Mesh {
  switch (kind) {
    case 'oil': {
      const m = new THREE.Mesh(
        new THREE.CircleGeometry(2.2, 16).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.05, metalness: 0.6 }),
      );
      m.position.y = 0.04;
      return m;
    }
    case 'tacks':
      return new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 6).translate(0, 0.05, 0),
        new THREE.MeshLambertMaterial({ color: '#c9ced6' }),
      );
    case 'cone':
      return new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.9, 10).translate(0, 0.45, 0),
        new THREE.MeshLambertMaterial({ color: '#ff6a00' }),
      );
  }
}

function shotMesh(kind: 'water-balloon' | 'homing'): THREE.Mesh {
  if (kind === 'water-balloon') {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#3fa9ff', transparent: true, opacity: 0.85 }),
    );
  }
  // A paper plane: a flat white dart.
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [0, 0, -0.8, -0.5, 0, 0.5, 0, 0.12, 0.3, 0, 0, -0.8, 0, 0.12, 0.3, 0.5, 0, 0.5],
      3,
    ),
  );
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }),
  );
}

/** Yaw that turns a model facing −Z to travel along heading h. */
const yawFor = (heading: number) => Math.atan2(-Math.cos(heading), -Math.sin(heading));

/**
 * Item boxes, traps, shots and smoke on the track. Meshes are kept per id and
 * reused, so nothing is built or thrown away every frame.
 */
export class ItemProps {
  readonly group = new THREE.Group();
  private readonly boxMat = new THREE.MeshStandardMaterial({
    map: labelTexture('?', '#ffb020', '#2a1600'),
    transparent: true,
    opacity: 0.9,
  });
  private readonly boxGeo = new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
  private boxes: THREE.Mesh[] = [];
  private readonly traps = new Map<string, THREE.Mesh>();
  private readonly shots = new Map<string, THREE.Mesh>();
  private readonly smoke: THREE.InstancedMesh;
  private spin = 0;

  constructor() {
    this.smoke = new THREE.InstancedMesh(
      new THREE.SphereGeometry(2.4, 8, 6),
      new THREE.MeshLambertMaterial({ color: '#9aa0a6', transparent: true, opacity: 0.55 }),
      48,
    );
    this.smoke.count = 0;
    this.group.add(this.smoke);
  }

  update(items: ItemView | null | undefined, groundAt: GroundAt, dt: number): void {
    this.group.visible = !!items;
    if (!items) return;
    this.spin += dt * SPIN_PER_S;
    this.syncBoxes(items, groundAt);
    this.sync(this.traps, items.traps, (t) => trapMesh(t.kind), groundAt, 0);
    this.sync(this.shots, items.shots, (s) => shotMesh(s.kind), groundAt, 1.1);
    const m = new THREE.Matrix4();
    const count = Math.min(items.smokes.length, 48);
    items.smokes.slice(0, count).forEach((p, i) => {
      m.makeScale(1, 0.7, 1).setPosition(p.x, groundAt(p.x, p.z) + 1.4, p.z);
      this.smoke.setMatrixAt(i, m);
    });
    this.smoke.count = count;
    this.smoke.instanceMatrix.needsUpdate = true;
  }

  private syncBoxes(items: ItemView, groundAt: GroundAt): void {
    if (this.boxes.length !== items.boxes.length) {
      for (const b of this.boxes) this.group.remove(b);
      this.boxes = items.boxes.map(() => {
        const mesh = new THREE.Mesh(this.boxGeo, this.boxMat);
        this.group.add(mesh);
        return mesh;
      });
    }
    items.boxes.forEach((b, i) => {
      const mesh = this.boxes[i];
      if (!mesh) return;
      mesh.visible = b.ready;
      const bob = Math.sin(this.spin * 2 + i) * 0.12;
      mesh.position.set(b.x, groundAt(b.x, b.z) + BOX_FLOAT_M + bob, b.z);
      mesh.rotation.set(0.4, this.spin + i, 0);
    });
  }

  private sync<
    T extends {
      readonly id: string;
      readonly x: number;
      readonly z: number;
      readonly heading: number;
    },
  >(
    meshes: Map<string, THREE.Mesh>,
    list: readonly T[],
    make: (t: T) => THREE.Mesh,
    groundAt: GroundAt,
    lift: number,
  ): void {
    const live = new Set<string>();
    for (const t of list) {
      live.add(t.id);
      let mesh = meshes.get(t.id);
      if (!mesh) {
        mesh = make(t);
        meshes.set(t.id, mesh);
        this.group.add(mesh);
      }
      mesh.position.set(t.x, groundAt(t.x, t.z) + lift, t.z);
      mesh.rotation.y = yawFor(t.heading);
    }
    for (const [id, mesh] of meshes) {
      if (live.has(id)) continue;
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      meshes.delete(id);
    }
  }

  dispose(): void {
    this.boxGeo.dispose();
    this.boxMat.map?.dispose();
    this.boxMat.dispose();
    for (const meshes of [this.traps, this.shots]) {
      for (const mesh of meshes.values()) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    }
    this.smoke.geometry.dispose();
    (this.smoke.material as THREE.Material).dispose();
  }
}

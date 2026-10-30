import * as THREE from 'three';
import { QuadBuilder } from './geometryBuilder';

/** Chunk size for merged city geometry, m: whole chunks off screen are culled. */
export const CHUNK_M = 300;

/**
 * Merged geometry per (material, map chunk): one draw call per material per
 * chunk, so the GPU only gets what the camera can see.
 */
export class ChunkedBuilders<K extends string> {
  private readonly builders = new Map<string, { kind: K; b: QuadBuilder }>();

  at(kind: K, x: number, z: number): QuadBuilder {
    const key = `${kind}|${Math.floor(x / CHUNK_M)},${Math.floor(z / CHUNK_M)}`;
    let entry = this.builders.get(key);
    if (!entry) {
      entry = { kind, b: new QuadBuilder() };
      this.builders.set(key, entry);
    }
    return entry.b;
  }

  /** Build every chunk into meshes added to `group`. */
  build(
    group: THREE.Group,
    material: (kind: K) => THREE.Material,
    shadows: (kind: K) => { cast: boolean; receive: boolean },
    keep: <T extends { dispose(): void }>(x: T) => T,
  ) {
    for (const { kind, b } of this.builders.values()) {
      if (b.empty) continue;
      const mesh = new THREE.Mesh(keep(b.build()), material(kind));
      const s = shadows(kind);
      mesh.castShadow = s.cast;
      mesh.receiveShadow = s.receive;
      group.add(mesh);
    }
  }
}

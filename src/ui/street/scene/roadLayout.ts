import * as THREE from 'three';

/** Shared helpers for placing many instances of street furniture. */

/** Small deterministic hash → 0..1, so decoration is stable between visits. */
export const hash = (a: number, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

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

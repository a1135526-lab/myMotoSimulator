import * as THREE from 'three';
import { grassTexture } from '../../scene/textures';
import type { RibbonSample } from './ribbons';

/** Every this many samples is checked first; the nearest is then refined around it. */
const COARSE_STRIDE = 5;
const REFINE = COARSE_STRIDE + 1;
/** Ground grid spacing, m. */
const CELL_M = 10;
/** Past the barrier the hills ease back down to the plain over this far, m. */
const FALLOFF_M = 160;
/** The ground sits just under the run-off, like the flat circuits' grass. */
const SINK_M = 0.06;

export interface TrackHeight {
  /** Road height there, m. */
  readonly y: number;
  /** Slope along the track, rise / run. */
  readonly grade: number;
  /** How far the point is from the centreline, m. */
  readonly offM: number;
}

const FLAT: TrackHeight = { y: 0, grade: 0, offM: 0 };

/** True when any part of the circuit leaves the ground plane. */
export const hilly = (samples: readonly RibbonSample[]): boolean =>
  samples.some((p) => (p.y ?? 0) !== 0);

/**
 * Height of the road nearest a ground point. The road is level side to side,
 * so a bike anywhere across it (or on the run-off) sits at the centreline's
 * height there. Circuits never pass close to themselves (circuits.test.ts),
 * so the nearest stretch of centreline is the right one.
 */
export class TrackHeights {
  private readonly flat: boolean;

  constructor(private readonly samples: readonly RibbonSample[]) {
    this.flat = !hilly(samples);
  }

  at(x: number, z: number): TrackHeight {
    const n = this.samples.length;
    if (this.flat || n === 0) return FLAT;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i += COARSE_STRIDE) {
      const p = this.samples[i] as RibbonSample;
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) [best, bestD] = [i, d];
    }
    for (let k = -REFINE; k <= REFINE; k++) {
      const i = (((best + k) % n) + n) % n;
      const p = this.samples[i] as RibbonSample;
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) [best, bestD] = [i, d];
    }
    // Slide along the segment towards the next sample for a smooth height.
    const a = this.samples[best] as RibbonSample;
    const b = this.samples[(best + 1) % n] as RibbonSample;
    const sx = b.x - a.x;
    const sz = b.z - a.z;
    const len2 = sx * sx + sz * sz || 1;
    const t = Math.max(-1, Math.min(1, ((x - a.x) * sx + (z - a.z) * sz) / len2));
    const c = t >= 0 ? b : (this.samples[(best - 1 + n) % n] as RibbonSample);
    const u = Math.abs(t);
    const ay = a.y ?? 0;
    const ag = a.grade ?? 0;
    return {
      y: ay + ((c.y ?? 0) - ay) * u,
      grade: ag + ((c.grade ?? 0) - ag) * u,
      offM: Math.sqrt(bestD),
    };
  }
}

const smoothstep = (t: number) => {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
};

/**
 * Rolling ground for a circuit with hills: level with the road out to the
 * barrier, then easing back down to the plain. Square, centred on (cx, cz).
 */
export function terrainMesh(
  heights: TrackHeights,
  edgeM: number,
  cx: number,
  cz: number,
  size: number,
): { mesh: THREE.Mesh; heightAt: (x: number, z: number) => number } {
  const heightAt = (x: number, z: number) => {
    const h = heights.at(x, z);
    return h.y * (1 - smoothstep((h.offM - edgeM) / FALLOFF_M)) - SINK_M;
  };
  const cells = Math.max(2, Math.round(size / CELL_M));
  const geometry = new THREE.PlaneGeometry(size, size, cells, cells);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const z = pos.getZ(i) + cz;
    pos.setY(i, heightAt(x, z));
  }
  geometry.computeVertexNormals();
  const grass = grassTexture();
  grass.repeat.set(size / 6, size / 6);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: grass }));
  mesh.position.set(cx, 0, cz);
  return { mesh, heightAt };
}

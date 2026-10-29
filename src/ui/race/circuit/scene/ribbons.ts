import * as THREE from 'three';

/** A centreline sample as the scene needs it. */
export interface RibbonSample {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly curvature: number;
  readonly s: number;
}

/** World point at lateral offset d (left of travel) from a sample. */
export const offsetPoint = (p: RibbonSample, d: number) => ({
  x: p.x + Math.sin(p.heading) * d,
  z: p.z - Math.cos(p.heading) * d,
});

interface RibbonOptions {
  /** Lateral offsets of the two edges, left-positive. */
  readonly from: number;
  readonly to: number;
  readonly y: number;
  /** Only emit quads where this returns a colour (or true for the default). */
  readonly colorAt?: (p: RibbonSample, index: number) => THREE.Color | null;
  /** Vertical wall of this height instead of a flat strip (uses `from` only). */
  readonly wallHeight?: number;
  /** Texture repeat along the track, metres per V unit. */
  readonly vScaleM?: number;
}

/**
 * Builds a strip that follows the closed centreline: flat (road, kerbs,
 * gravel) or vertical (barriers). Each segment is its own quad so segments
 * can be skipped or coloured individually.
 */
export function ribbon(
  samples: readonly RibbonSample[],
  opts: RibbonOptions,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const n = samples.length;
  const vScale = opts.vScaleM ?? 4;

  for (let i = 0; i < n; i++) {
    const a = samples[i] as RibbonSample;
    const b = samples[(i + 1) % n] as RibbonSample;
    const color = opts.colorAt ? opts.colorAt(a, i) : null;
    if (opts.colorAt && !color) continue;

    let quad: [number, number, number][];
    if (opts.wallHeight !== undefined) {
      const pa = offsetPoint(a, opts.from);
      const pb = offsetPoint(b, opts.from);
      const h = opts.wallHeight;
      quad = [
        [pa.x, opts.y, pa.z],
        [pb.x, opts.y, pb.z],
        [pb.x, opts.y + h, pb.z],
        [pa.x, opts.y + h, pa.z],
      ];
    } else {
      const al = offsetPoint(a, opts.to);
      const ar = offsetPoint(a, opts.from);
      const bl = offsetPoint(b, opts.to);
      const br = offsetPoint(b, opts.from);
      quad = [
        [ar.x, opts.y, ar.z],
        [br.x, opts.y, br.z],
        [bl.x, opts.y, bl.z],
        [al.x, opts.y, al.z],
      ];
    }
    const v0 = a.s / vScale;
    const v1 = v0 + Math.hypot(b.x - a.x, b.z - a.z) / vScale;
    const quadUv = [
      [0, v0],
      [0, v1],
      [1, v1],
      [1, v0],
    ];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(...(quad[k] as [number, number, number]));
      uv.push(...(quadUv[k] as number[]));
      if (color) col.push(color.r, color.g, color.b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (col.length) geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geometry.computeVertexNormals();
  return geometry;
}

import type * as THREE from 'three';
import type { P2, QuadBuilder } from './geometryBuilder';

/** Polyline geometry for roads drawn along real, bendy centrelines. */

export interface Line {
  readonly points: readonly P2[];
  readonly cum: readonly number[];
  readonly length: number;
}

/** The part of a polyline between distances s0 < s1 along it. */
export function slice(line: Line, s0: number, s1: number): P2[] {
  const a = Math.max(0, s0);
  const b = Math.min(line.length, s1);
  if (b <= a) return [];
  const at = (s: number): P2 => {
    let i = 1;
    while (i < line.points.length - 1 && (line.cum[i] ?? 0) < s) i++;
    const p = line.points[i - 1] as P2;
    const q = line.points[i] as P2;
    const c0 = line.cum[i - 1] ?? 0;
    const seg = (line.cum[i] ?? 0) - c0;
    const t = seg > 0 ? (s - c0) / seg : 0;
    return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t };
  };
  const out = [at(a)];
  line.points.forEach((p, i) => {
    const c = line.cum[i] ?? 0;
    if (c > a && c < b) out.push(p);
  });
  out.push(at(b));
  return out;
}

/** Right-of-travel unit normal of segment p → q: (−sin h, cos h). */
function normal(p: P2, q: P2): P2 {
  const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
  return { x: -(q.z - p.z) / len, z: (q.x - p.x) / len };
}

/** The polyline moved `off` m to the right (negative: left), mitred at bends. */
export function offset(points: readonly P2[], off: number): P2[] {
  return points.map((p, i) => {
    const prev = points[i - 1];
    const next = points[i + 1];
    const n0 = prev ? normal(prev, p) : null;
    const n1 = next ? normal(p, next) : null;
    let nx = (n0?.x ?? 0) + (n1?.x ?? 0);
    let nz = (n0?.z ?? 0) + (n1?.z ?? 0);
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    // Stretch at a bend so the band keeps its width, within reason.
    const ref = n0 ?? n1 ?? { x: 0, z: 0 };
    const cos = Math.max(0.5, nx * ref.x + nz * ref.z);
    return { x: p.x + (nx * off) / cos, z: p.z + (nz * off) / cos };
  });
}

/** A flat band between two offsets (left < right) along a polyline. */
export function band(
  b: QuadBuilder,
  points: readonly P2[],
  left: number,
  right: number,
  y: number,
  tile: number,
  color: THREE.Color | null = null,
) {
  if (points.length < 2) return;
  const l = offset(points, left);
  const r = offset(points, right);
  for (let i = 0; i + 1 < points.length; i++) {
    b.flatQuad(r[i] as P2, r[i + 1] as P2, l[i + 1] as P2, l[i] as P2, y, tile, color);
  }
}

/** A vertical strip (kerb face) along an offset line, facing `faceRight` or left. */
export function kerb(
  b: QuadBuilder,
  points: readonly P2[],
  off: number,
  y0: number,
  y1: number,
  faceRight: boolean,
) {
  const line = offset(points, off);
  for (let i = 0; i + 1 < line.length; i++) {
    const p = line[i] as P2;
    const q = line[i + 1] as P2;
    // wall(a, b) faces right of a → b (normal (−r_z, r_x)); flip to face left.
    if (faceRight) b.wall(p.x, p.z, q.x, q.z, y0, y1, 2, 1);
    else b.wall(q.x, q.z, p.x, p.z, y0, y1, 2, 1);
  }
}

/** Dashes along a line: dash m painted, gap m clear, between s0 and s1. */
export function dashes(
  b: QuadBuilder,
  line: Line,
  s0: number,
  s1: number,
  left: number,
  right: number,
  y: number,
  dash: number,
  gap: number,
) {
  for (let s = s0; s < s1; s += dash + gap)
    band(b, slice(line, s, Math.min(s + dash, s1)), left, right, y, 1);
}

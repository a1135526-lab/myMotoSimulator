import type { Vec2 } from '../circuit/geometry';

/** Plane geometry on the ground (x east, z south), metres. */

export type { Vec2 };

export interface Bounds {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
}

export const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z);

/** Heading of the direction a → b (forward = (cos h, sin h)). */
export const headingOf = (a: Vec2, b: Vec2) => Math.atan2(b.z - a.z, b.x - a.x);

/** Angle wrapped to (−π, π]. */
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export interface SegmentHit {
  /** 0–1 along the segment. */
  readonly t: number;
  readonly x: number;
  readonly z: number;
  readonly d: number;
}

/** Closest point on segment a–b to p. */
export function closestOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): SegmentHit {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  const x = ax + dx * t;
  const z = az + dz * t;
  return { t, x, z, d: Math.hypot(px - x, pz - z) };
}

/** Even–odd point-in-polygon. */
export function insidePolygon(ring: readonly Vec2[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Vec2;
    const b = ring[j] as Vec2;
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function boundsOf(points: readonly Vec2[], pad = 0): Bounds {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minZ = Math.min(minZ, p.z);
    maxX = Math.max(maxX, p.x);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX: minX - pad, minZ: minZ - pad, maxX: maxX + pad, maxZ: maxZ + pad };
}

export const inBounds = (b: Bounds, x: number, z: number) =>
  x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

/** Signed area (positive when the ring runs counter-clockwise in x/z). */
export function signedArea(ring: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as Vec2;
    const q = ring[(i + 1) % ring.length] as Vec2;
    a += p.x * q.z - q.x * p.z;
  }
  return a / 2;
}

/** Do two convex polygons overlap (separating-axis test)? */
export function convexOverlap(a: readonly Vec2[], b: readonly Vec2[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i] as Vec2;
      const q = poly[(i + 1) % poly.length] as Vec2;
      const nx = q.z - p.z;
      const nz = p.x - q.x;
      let minA = Infinity;
      let maxA = -Infinity;
      for (const v of a) {
        const s = v.x * nx + v.z * nz;
        minA = Math.min(minA, s);
        maxA = Math.max(maxA, s);
      }
      let minB = Infinity;
      let maxB = -Infinity;
      for (const v of b) {
        const s = v.x * nx + v.z * nz;
        minB = Math.min(minB, s);
        maxB = Math.max(maxB, s);
      }
      if (maxA < minB || maxB < minA) return false;
    }
  }
  return true;
}

/** Flat [x0, z0, x1, z1, …] → points. */
export function pointsOf(flat: readonly number[], from = 0): Vec2[] {
  const out: Vec2[] = [];
  for (let i = from; i + 1 < flat.length; i += 2)
    out.push({ x: flat[i] ?? 0, z: flat[i + 1] ?? 0 });
  return out;
}

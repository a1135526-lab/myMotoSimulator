/**
 * Closed race-circuit centreline.
 *
 * A circuit is authored as a loop of control points (metres, x/z ground
 * plane). We pass a closed Catmull-Rom spline through them, resample it at a
 * fixed arc-length step, and compute heading and signed curvature at every
 * sample. Everything else (rider physics, AI speed profile, 3D road mesh)
 * works in track coordinates: s = distance along the centreline, d = lateral
 * offset to the left.
 *
 * Conventions: heading h is the direction of travel, forward = (cos h, sin h).
 * The x/z ground plane is the 3D scene's: seen from above, +x is right and +z
 * is down the screen, so the rider's left is (sin h, −cos h) and a left turn
 * makes h decrease. Curvature κ = −dh/ds (> 0 turning left).
 */
export interface Vec2 {
  readonly x: number;
  readonly z: number;
}

export interface TrackSample {
  readonly s: number;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly curvature: number;
}

export interface CircuitGeometry {
  readonly length: number;
  readonly step: number;
  readonly samples: readonly TrackSample[];
  /** Tarmac half-width, m. */
  readonly halfWidth: number;
}

const SUBDIVISIONS = 60;
/** Curvature is smoothed over ± this many metres to remove spline wobble. */
const CURVATURE_WINDOW_M = 6;

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) };
}

function densePolyline(points: readonly Vec2[]): Vec2[] {
  const n = points.length;
  const at = (i: number) => points[((i % n) + n) % n] as Vec2;
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < SUBDIVISIONS; k++) {
      out.push(catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), k / SUBDIVISIONS));
    }
  }
  return out;
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function buildCircuit(
  controlPoints: readonly Vec2[],
  halfWidth: number,
  step = 2,
): CircuitGeometry {
  if (controlPoints.length < 4) throw new Error('A circuit needs at least 4 control points');
  const dense = densePolyline(controlPoints);
  dense.push(dense[0] as Vec2);

  // Cumulative arc length along the dense polyline.
  const cum = [0];
  for (let i = 1; i < dense.length; i++) {
    const a = dense[i - 1] as Vec2;
    const b = dense[i] as Vec2;
    cum.push((cum[i - 1] ?? 0) + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const total = cum[cum.length - 1] ?? 0;
  const count = Math.max(8, Math.round(total / step));
  const ds = total / count;

  // Uniform resample.
  const pts: Vec2[] = [];
  let j = 1;
  for (let i = 0; i < count; i++) {
    const target = i * ds;
    while (j < cum.length - 1 && (cum[j] ?? 0) < target) j++;
    const a = dense[j - 1] as Vec2;
    const b = dense[j] as Vec2;
    const c0 = cum[j - 1] ?? 0;
    const t = ((target - c0) / ((cum[j] ?? c0) - c0 || 1)) as number;
    pts.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  }

  const at = (i: number) => pts[((i % count) + count) % count] as Vec2;
  const headings = pts.map((_, i) => {
    const a = at(i - 1);
    const b = at(i + 1);
    return Math.atan2(b.z - a.z, b.x - a.x);
  });
  const win = Math.max(1, Math.round(CURVATURE_WINDOW_M / ds));
  const samples = pts.map((p, i) => {
    const h0 = headings[(((i - win) % count) + count) % count] ?? 0;
    const h1 = headings[(i + win) % count] ?? 0;
    return {
      s: i * ds,
      x: p.x,
      z: p.z,
      heading: headings[i] ?? 0,
      curvature: -wrapAngle(h1 - h0) / (2 * win * ds),
    };
  });
  return { length: total, step: ds, samples, halfWidth };
}

export const wrapS = (geo: CircuitGeometry, s: number): number =>
  ((s % geo.length) + geo.length) % geo.length;

/** Track sample at any s (wraps around the lap), linearly interpolated. */
export function sampleAt(geo: CircuitGeometry, s: number): TrackSample {
  const n = geo.samples.length;
  const u = wrapS(geo, s) / geo.step;
  const i = Math.floor(u) % n;
  const a = geo.samples[i] as TrackSample;
  const b = geo.samples[(i + 1) % n] as TrackSample;
  const t = u - Math.floor(u);
  return {
    s: wrapS(geo, s),
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    heading: a.heading + wrapAngle(b.heading - a.heading) * t,
    curvature: a.curvature + (b.curvature - a.curvature) * t,
  };
}

/** World position and heading for track coordinates (s, lateral offset d to the left). */
export function toWorld(geo: CircuitGeometry, s: number, d: number) {
  const p = sampleAt(geo, s);
  return {
    x: p.x + Math.sin(p.heading) * d,
    z: p.z - Math.cos(p.heading) * d,
    heading: p.heading,
  };
}

/** Largest |curvature| on the lap — the tightest corner is 1 / this. */
export const maxCurvature = (geo: CircuitGeometry): number =>
  geo.samples.reduce((m, p) => Math.max(m, Math.abs(p.curvature)), 0);

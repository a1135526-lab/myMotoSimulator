import { wrapS, type CircuitGeometry, type TrackSample } from './geometry';
import type { CornerLimits, LateralState } from './lateral';
import type { CircuitRider } from './rider';

/**
 * Contact without crashing: a rider who hits the barrier bounces off it and
 * one who touches another bike is shoved aside, both losing speed, but nobody
 * falls off or is put back on track. Track coordinates (s along, d across).
 */

/** Closing speed above which a touch counts as a real hit (shown, spoils the lap). */
export const HARD_HIT_MPS = 3;
/** How long a hit is shown on screen, s. */
export const HIT_SHOWN_S = 0.8;
/** Share of the speed into the barrier that comes back out of it. */
const BARRIER_BOUNCE = 0.25;
/** Share of the speed along the barrier kept when glancing off it. */
const BARRIER_SLIDE_KEEP = 0.85;
/** Bike footprint for touching another bike, m. */
export const BIKE_LENGTH_M = 2.1;
export const BIKE_WIDTH_M = 0.9;
/** Heading kick away from a bike touched side by side, rad. */
const SIDE_KICK_RAD = 0.04;
/** AI look-ahead for a bike to go round, m, and how far aside they go. */
const AVOID_AHEAD_M = 14;
const AVOID_SIDE_M = 1.8;

export interface Bounce {
  readonly lat: LateralState;
  readonly speedMps: number;
  /** Speed straight into the barrier at impact, m/s. */
  readonly impactMps: number;
}

/**
 * Past the barrier line: put the rider back on it, heading reflected away,
 * speed into it mostly lost and speed along it partly kept.
 */
export function bounceOffBarrier(
  limits: CornerLimits,
  lat: LateralState,
  speedMps: number,
): Bounce {
  const side = Math.sign(lat.d) || 1;
  const edge = limits.halfWidth + limits.runoffM;
  const into = Math.max(0, speedMps * Math.sin(lat.psi) * side);
  const along = speedMps * Math.cos(lat.psi) * BARRIER_SLIDE_KEEP;
  const out = into * BARRIER_BOUNCE;
  return {
    lat: { ...lat, d: side * (edge - 0.05), psi: Math.atan2(-side * out, along), lean: 0 },
    speedMps: Math.hypot(along, out),
    impactMps: into,
  };
}

/** Signed distance along the lap from a to b, in (−L/2, L/2]. */
export function gapAlong(geo: CircuitGeometry, a: number, b: number): number {
  const L = geo.length;
  let ds = (b - a) % L;
  if (ds > L / 2) ds -= L;
  if (ds <= -L / 2) ds += L;
  return ds;
}

export interface ContactBody {
  readonly s: number;
  readonly d: number;
  readonly psi: number;
  readonly speedMps: number;
}

export interface ContactResult<T extends ContactBody> {
  readonly bodies: T[];
  /** Index of each body that took a hard hit this step. */
  readonly hard: ReadonlySet<number>;
}

/**
 * Bikes overlapping each other are pushed apart. Side by side they're shoved
 * across the track and nudged away; nose to tail the one behind is slowed to
 * share speed with the one in front. Bodies with `fixed` set don't move (a
 * remote rider, known only from the network).
 */
export function resolveContacts<T extends ContactBody>(
  geo: CircuitGeometry,
  input: readonly T[],
  fixed: (i: number) => boolean = () => false,
): ContactResult<T> {
  const bodies = [...input];
  const hard = new Set<number>();
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i] as T;
      const b = bodies[j] as T;
      const ds = gapAlong(geo, a.s, b.s);
      const dd = b.d - a.d;
      const overS = BIKE_LENGTH_M - Math.abs(ds);
      const overD = BIKE_WIDTH_M - Math.abs(dd);
      if (overS <= 0 || overD <= 0) continue;
      if (fixed(i) && fixed(j)) continue;
      // Share of the push each takes: a fixed body takes none.
      const w = (k: number, other: number) => (fixed(k) ? 0 : fixed(other) ? 1 : 0.5);
      const wa = w(i, j);
      const wb = w(j, i);
      if (overD / BIKE_WIDTH_M < overS / BIKE_LENGTH_M) {
        // Side by side: push across, a little kick apart.
        const dir = Math.sign(dd) || 1;
        const closing = Math.abs(a.speedMps * Math.sin(a.psi) - b.speedMps * Math.sin(b.psi));
        bodies[i] = { ...a, d: a.d - dir * overD * wa, psi: a.psi - dir * SIDE_KICK_RAD * wa };
        bodies[j] = { ...b, d: b.d + dir * overD * wb, psi: b.psi + dir * SIDE_KICK_RAD * wb };
        if (closing > HARD_HIT_MPS) hard.add(i).add(j);
      } else {
        // Nose to tail: pushed apart, and the closing speed is shared out.
        const [rear, front, wr, wf] = ds > 0 ? [i, j, wa, wb] : [j, i, wb, wa];
        const r = bodies[rear] as T;
        const f = bodies[front] as T;
        const closing = Math.max(0, r.speedMps - f.speedMps);
        bodies[rear] = { ...r, s: r.s - overS * wr, speedMps: r.speedMps - closing * wr };
        bodies[front] = { ...f, s: f.s + overS * wf, speedMps: f.speedMps + closing * wf };
        if (closing > HARD_HIT_MPS) hard.add(rear).add(front);
      }
    }
  }
  return { bodies, hard };
}

/** An AI rider's line, moved aside to go round a slower bike just ahead on it. */
export function avoidLine(
  geo: CircuitGeometry,
  me: ContactBody,
  lineD: number,
  halfWidth: number,
  others: readonly ContactBody[],
): number {
  for (const o of others) {
    const ahead = gapAlong(geo, me.s, o.s);
    if (ahead <= 0 || ahead > AVOID_AHEAD_M) continue;
    if (Math.abs(o.d - lineD) > AVOID_SIDE_M || o.speedMps >= me.speedMps) continue;
    const toLeft = o.d + AVOID_SIDE_M;
    const toRight = o.d - AVOID_SIDE_M;
    const room = halfWidth - 1;
    const left = toLeft <= room;
    const right = toRight >= -room;
    if (left && (!right || Math.abs(toLeft - lineD) <= Math.abs(toRight - lineD))) return toLeft;
    if (right) return toRight;
  }
  return lineD;
}

/** Search window either side of a hint when placing a world point on the track, m. */
const TRACK_SEARCH_M = 40;

/** Track coordinates of a world point, searched near `nearS` (s, d left, track heading). */
export function toTrack(geo: CircuitGeometry, x: number, z: number, nearS: number) {
  const n = geo.samples.length;
  const centre = Math.round(nearS / geo.step);
  const reach = Math.ceil(TRACK_SEARCH_M / geo.step);
  let best = geo.samples[((centre % n) + n) % n] as TrackSample;
  let bestD2 = Infinity;
  for (let k = -reach; k <= reach; k++) {
    const p = geo.samples[(((centre + k) % n) + n) % n] as TrackSample;
    const d2 = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d2 < bestD2) [best, bestD2] = [p, d2];
  }
  const dx = x - best.x;
  const dz = z - best.z;
  return {
    s: best.s + dx * Math.cos(best.heading) + dz * Math.sin(best.heading),
    d: dx * Math.sin(best.heading) - dz * Math.cos(best.heading),
    heading: best.heading,
  };
}

/** Riders after bumping into each other and into `others` (bikes that can't be moved). */
export function collideRiders(
  geo: CircuitGeometry,
  riders: readonly CircuitRider[],
  others: readonly ContactBody[],
  clockS: number,
): CircuitRider[] {
  const bodies: ContactBody[] = [
    ...riders.map((r) => ({ s: r.lat.s, d: r.lat.d, psi: r.lat.psi, speedMps: r.sim.speedMps })),
    ...others,
  ];
  const { bodies: out, hard } = resolveContacts(geo, bodies, (i) => i >= riders.length);
  return riders.map((r, i) => {
    const b = out[i] as ContactBody;
    if (b === bodies[i]) return r;
    const ds = gapAlong(geo, r.lat.s, b.s);
    return {
      ...r,
      sim: { ...r.sim, speedMps: Math.max(0, b.speedMps) },
      lat: { ...r.lat, s: wrapS(geo, b.s), d: b.d, psi: b.psi },
      progressM: r.progressM + ds,
      hitAtS: hard.has(i) ? clockS : r.hitAtS,
    };
  });
}

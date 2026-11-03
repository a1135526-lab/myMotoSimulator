import type { CircuitRider } from './rider';
import type { CircuitGeometry } from './geometry';
import { toWorld } from './geometry';

/**
 * A ghost is your best lap played back: where the bike was every tenth of a
 * second, eased in between, so you can race your own line.
 */

/** Recording interval, s. */
export const GHOST_SAMPLE_S = 0.1;

/** Where a bike is, how it points and leans, in world coordinates. */
export interface GhostPose {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly lean: number;
}

/** A pose `t` seconds into the lap. */
export interface GhostSample extends GhostPose {
  readonly t: number;
}

export interface GhostLap {
  readonly lapS: number;
  readonly samples: readonly GhostSample[];
  /** "Brand Model" of the bike that set it. */
  readonly bike: string;
  readonly manual: boolean;
  /** Whose lap, when it's another rider's from the global board; absent = yours. */
  readonly owner?: string;
}

/** The rider's pose as the ghost records it (and the 3D scene draws it). */
export function riderPose(geo: CircuitGeometry, rider: CircuitRider): GhostPose {
  const w = toWorld(geo, rider.lat.s, rider.lat.d);
  // ψ > 0 points left of the track, and left turns lower the heading.
  return { x: w.x, z: w.z, heading: w.heading - rider.lat.psi, lean: rider.lat.lean };
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** Shortest way round between two headings. */
function lerpAngle(a: number, b: number, f: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * f;
}

/** The ghost `t` seconds into its lap; null before it starts or once it's done. */
export function ghostPoseAt(samples: readonly GhostSample[], t: number): GhostPose | null {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || t < first.t || t > last.t) return null;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((samples[mid] as GhostSample).t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo] as GhostSample;
  const b = samples[hi] as GhostSample;
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return {
    x: lerp(a.x, b.x, f),
    z: lerp(a.z, b.z, f),
    heading: lerpAngle(a.heading, b.heading, f),
    lean: lerp(a.lean, b.lean, f),
  };
}

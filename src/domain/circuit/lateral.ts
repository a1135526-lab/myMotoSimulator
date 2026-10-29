import { clamp, STANDARD_GRAVITY } from '../units';
import { sampleAt, type CircuitGeometry } from './geometry';

/**
 * Cornering for a single-track vehicle, in track coordinates.
 *
 * A motorcycle turns by leaning: in a steady turn at lean φ the path curvature
 * is  κ = g·tan φ / v².  Lean is limited by tyre grip μ (tan φ ≤ μ), so a
 * corner tighter than μ·g / v² cannot be followed — the bike runs wide.
 *
 * State per rider: s (along the centreline), d (left of centreline),
 * ψ (heading relative to the track) and φ (lean). Integrated as
 *   s' = v·cos ψ / (1 − κ_track·d)
 *   d' = v·sin ψ
 *   ψ' = v·κ_path − κ_track·s'
 */

/** How fast a rider can roll the bike from side to side, rad/s. */
export const ROLL_RATE_RAD_S = 3.2;
/** Below this speed lean can't steer (it would give infinite curvature). */
export const MIN_LEAN_SPEED_MPS = 3;
/** Slow-speed steering (feet down, bars turned): path curvature per unit steer. */
const LOW_SPEED_CURVATURE = 0.12;
/** Lean is kept a hair inside the grip limit so steady corners don't skate. */
const LEAN_MARGIN = 0.97;
/** Assist: max heading the rider asks for when moving across the track. */
const ASSIST_HEADING_RAD = 0.35;
/** Assist: heading correction look-ahead (min metres, and seconds of travel). */
const LOOKAHEAD_MIN_M = 8;
const LOOKAHEAD_S = 0.5;

/** Grass / gravel: much less grip and lots of drag. */
export const RUNOFF_GRIP_G = 0.55;
export const RUNOFF_ROLLING_COEFF = 0.09;

export type Surface = 'track' | 'runoff' | 'barrier';

export interface LateralState {
  readonly s: number;
  readonly d: number;
  readonly psi: number;
  readonly lean: number;
}

export interface CornerLimits {
  readonly halfWidth: number;
  readonly runoffM: number;
  readonly gripG: number;
}

export const STRAIGHT_AHEAD: Omit<LateralState, 's'> = { d: 0, psi: 0, lean: 0 };

export const surfaceAt = (limits: CornerLimits, d: number): Surface => {
  const off = Math.abs(d);
  if (off <= limits.halfWidth) return 'track';
  return off <= limits.halfWidth + limits.runoffM ? 'runoff' : 'barrier';
};

export const gripOn = (limits: CornerLimits, surface: Surface): number =>
  surface === 'track' ? limits.gripG : RUNOFF_GRIP_G;

export const maxLean = (gripG: number): number => Math.atan(gripG) * LEAN_MARGIN;

/**
 * Friction circle: grip left for driving / braking while cornering at `lean`,
 * as a fraction of the full grip (1 upright → 0 at the limit).
 */
export function longitudinalGripShare(lean: number, gripG: number): number {
  const lateral = Math.tan(Math.abs(lean)) / gripG;
  return Math.sqrt(Math.max(0, 1 - lateral * lateral));
}

/**
 * Lean the rider is asking for.
 * Without assist, steer (−1…1, + = left) maps straight onto lean.
 * With assist, the bike leans to follow the track and steer moves it across
 * the tarmac — like the riding aids in racing games. Both are capped by grip,
 * so overspeed still runs wide. `extraCurvature` is turning already supplied
 * by something else (a drift), so the lean only has to make up the rest.
 */
export function targetLean(
  geo: CircuitGeometry,
  state: LateralState,
  speedMps: number,
  steer: number,
  gripG: number,
  assist: boolean,
  extraCurvature = 0,
): number {
  const limit = maxLean(gripG);
  if (!assist) return clamp(steer, -1, 1) * limit;

  const kWanted = assistCurvature(geo, state, speedMps, steer) - extraCurvature;
  const v2 = Math.max(speedMps, MIN_LEAN_SPEED_MPS) ** 2;
  return clamp(Math.atan((v2 * kWanted) / STANDARD_GRAVITY), -limit, limit);
}

/** Path curvature the assist asks for: follow the track, steer moves across it. */
export function assistCurvature(
  geo: CircuitGeometry,
  state: LateralState,
  speedMps: number,
  steer: number,
): number {
  const kTrack = sampleAt(geo, state.s).curvature;
  const follow = kTrack / Math.max(0.2, 1 - kTrack * state.d);
  const lookahead = Math.max(LOOKAHEAD_MIN_M, speedMps * LOOKAHEAD_S);
  const wantedPsi = clamp(steer, -1, 1) * ASSIST_HEADING_RAD;
  return follow + (2 * (wantedPsi - state.psi)) / lookahead;
}

/** Tightest path a bike can hold on lean alone at this speed. */
export const leanCurvatureLimit = (gripG: number, speedMps: number): number =>
  (STANDARD_GRAVITY * Math.tan(maxLean(gripG))) / Math.max(speedMps, MIN_LEAN_SPEED_MPS) ** 2;

/** Roll toward the target lean, rate-limited. */
export const stepLean = (lean: number, target: number, dtS: number): number =>
  lean + clamp(target - lean, -ROLL_RATE_RAD_S * dtS, ROLL_RATE_RAD_S * dtS);

/** Path curvature produced by the current lean (or low-speed steering). */
export function pathCurvature(lean: number, speedMps: number, steer: number): number {
  if (speedMps < MIN_LEAN_SPEED_MPS) return clamp(steer, -1, 1) * LOW_SPEED_CURVATURE;
  return (STANDARD_GRAVITY * Math.tan(lean)) / (speedMps * speedMps);
}

/** Advance position along / across the track for one step. */
export function integrate(
  geo: CircuitGeometry,
  state: LateralState,
  speedMps: number,
  kPath: number,
  dtS: number,
): LateralState & { readonly ds: number } {
  const kTrack = sampleAt(geo, state.s).curvature;
  const ds = (speedMps * Math.cos(state.psi) * dtS) / Math.max(0.2, 1 - kTrack * state.d);
  const psi = state.psi + (speedMps * kPath * dtS - kTrack * ds);
  return {
    s: state.s + ds,
    d: state.d + speedMps * Math.sin(state.psi) * dtS,
    psi: Math.atan2(Math.sin(psi), Math.cos(psi)),
    lean: state.lean,
    ds,
  };
}

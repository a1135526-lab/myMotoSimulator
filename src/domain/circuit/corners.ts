import { wrapS, type CircuitGeometry } from './geometry';

/**
 * The corners of a circuit, found from the centreline's curvature, for the
 * "next corner" call-out: which way, how tight, and how far.
 */

export type CornerKind = 'hairpin' | 'tight' | 'medium' | 'fast';

export interface Corner {
  /** Where it starts and ends along the lap, m (end may be past the lap length). */
  readonly startS: number;
  readonly endS: number;
  readonly dir: 'left' | 'right';
  /** Tightest radius in it, m. */
  readonly minRadiusM: number;
  /** How far it turns, degrees. */
  readonly turnDeg: number;
  readonly kind: CornerKind;
}

/** Bends gentler than this radius are straights, m. */
const STRAIGHT_RADIUS_M = 180;
/** Same-way bends closer than this are one corner, m. */
const MERGE_GAP_M = 15;
/** A kink that turns less than this isn't worth calling, degrees. */
const MIN_TURN_DEG = 20;
const RAD_TO_DEG = 180 / Math.PI;

export function cornerKind(minRadiusM: number, turnDeg: number): CornerKind {
  if (minRadiusM < 30 || turnDeg >= 150) return 'hairpin';
  if (minRadiusM < 60) return 'tight';
  if (minRadiusM < 110) return 'medium';
  return 'fast';
}

interface Run {
  startS: number;
  endS: number;
  sign: number;
  maxK: number;
  turn: number;
}

export function findCorners(geo: CircuitGeometry): Corner[] {
  const { samples, step } = geo;
  const n = samples.length;
  const on = 1 / STRAIGHT_RADIUS_M;
  // Start on a straight so no corner is split across the line.
  const first = samples.findIndex((p) => Math.abs(p.curvature) < on);
  if (first < 0) return [];

  const runs: Run[] = [];
  let run: Run | null = null;
  for (let k = 0; k < n; k++) {
    const i = (first + k) % n;
    const p = samples[i];
    if (!p) continue;
    const s = first * step + k * step;
    const sign = Math.sign(p.curvature);
    const curving = Math.abs(p.curvature) >= on;
    if (!curving) continue;
    if (run && run.sign === sign && s - run.endS <= MERGE_GAP_M) {
      run.endS = s;
      run.maxK = Math.max(run.maxK, Math.abs(p.curvature));
    } else {
      run = { startS: s, endS: s, sign, maxK: Math.abs(p.curvature), turn: 0 };
      runs.push(run);
    }
    run.turn += p.curvature * step;
  }

  return runs.flatMap((r) => {
    const turnDeg = Math.abs(r.turn) * RAD_TO_DEG;
    if (turnDeg < MIN_TURN_DEG) return [];
    const minRadiusM = 1 / r.maxK;
    return [
      {
        startS: wrapS(geo, r.startS),
        endS: wrapS(geo, r.startS) + (r.endS - r.startS),
        dir: r.sign > 0 ? 'left' : 'right',
        minRadiusM,
        turnDeg,
        kind: cornerKind(minRadiusM, turnDeg),
      } satisfies Corner,
    ];
  });
}

/** The corner you're in (distance 0) or the next one ahead, and how far to it, m. */
export function nextCorner(
  geo: CircuitGeometry,
  corners: readonly Corner[],
  s: number,
): { corner: Corner; distanceM: number } | null {
  let best: { corner: Corner; distanceM: number } | null = null;
  const here = wrapS(geo, s);
  for (const c of corners) {
    const into = wrapS(geo, here - c.startS);
    if (into <= c.endS - c.startS) return { corner: c, distanceM: 0 };
    const ahead = wrapS(geo, c.startS - here);
    if (!best || ahead < best.distanceM) best = { corner: c, distanceM: ahead };
  }
  return best;
}

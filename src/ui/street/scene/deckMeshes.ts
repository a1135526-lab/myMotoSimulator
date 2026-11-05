import type { CityMap, Overpass, RoadEdge } from '@/domain';
import type { ChunkedBuilders } from './chunks';
import type { P2, QuadBuilder } from './geometryBuilder';
import { offset } from './polyline';
import type { RoadPart } from './roadMeshes';

/**
 * Elevated roads, so they read as 高架 and not as one more street: a deck
 * that climbs its ramps, concrete parapets, a fascia beam and piers down to
 * the ground. Also the viaducts you can't ride (freeway, railway), passed
 * under. Heights come from the map (RoadEdge.heights, Overpass.heightM).
 */

const DECK_Y = 0.05;
const PARAPET_M = 1.0;
const PARAPET_T = 0.3;
const BEAM_M = 1.3;
const PIER_EVERY_M = 30;
const PIER_HALF_M = 0.8;
/** Below this the ramp is near enough the ground to need no walls or piers. */
const RAISED_M = 0.4;
const PIER_FROM_M = 2.5;

type Builder = QuadBuilder;
type V3 = readonly [number, number, number];

function slopedQuad(b: Builder, p: V3, q: V3, r: V3, s: V3, tile: number, lenM: number, w: number) {
  // p, q along the right edge, r, s back along the left: faces up, as band() does.
  b.quad(p, q, r, s, [0, 1, 0], [0, 0, w / tile, lenM / tile]);
}

/** A strip between two offsets along a polyline whose height changes point by point. */
function slopedStrip(
  b: Builder,
  pts: readonly P2[],
  ys: readonly number[],
  left: number,
  right: number,
  tile: number,
) {
  const l = offset(pts, left);
  const r = offset(pts, right);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ri, rj, lj, li] = [r[i], r[i + 1], l[i + 1], l[i]] as P2[];
    if (!ri || !rj || !lj || !li) continue;
    const y0 = ys[i] ?? 0;
    const y1 = ys[i + 1] ?? 0;
    const len = Math.hypot(rj.x - ri.x, rj.z - ri.z);
    slopedQuad(
      b,
      [ri.x, y0, ri.z],
      [rj.x, y1, rj.z],
      [lj.x, y1, lj.z],
      [li.x, y0, li.z],
      tile,
      len,
      right - left,
    );
  }
}

/**
 * A wall along an offset line, from `below` under to `above` over the deck,
 * facing away from the centreline (or towards it: the parapet's road side).
 */
function sideWall(
  b: Builder,
  pts: readonly P2[],
  ys: readonly number[],
  off: number,
  below: number,
  above: number,
  minY: number,
  faceOut = true,
) {
  const line = offset(pts, off);
  for (let i = 0; i + 1 < line.length; i++) {
    const p = line[i] as P2;
    const q = line[i + 1] as P2;
    const y0 = ys[i] ?? 0;
    const y1 = ys[i + 1] ?? 0;
    if (Math.max(y0, y1) < minY) continue;
    const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    // Right of p → q is (−dz, dx); the wall faces away from the centreline.
    const side = (off >= 0 ? 1 : -1) * (faceOut ? 1 : -1);
    const n: V3 = [(-(q.z - p.z) / len) * side, 0, ((q.x - p.x) / len) * side];
    const [a, c] = side > 0 ? [p, q] : [q, p];
    const [ya, yc] = side > 0 ? [y0, y1] : [y1, y0];
    const uv = [0, 0, len / 2, (above + below) / 2] as const;
    b.quad(
      [a.x, Math.max(0, ya - below), a.z],
      [c.x, Math.max(0, yc - below), c.z],
      [c.x, yc + above, c.z],
      [a.x, ya + above, a.z],
      n,
      uv,
    );
  }
}

/** Square piers every PIER_EVERY_M where the deck is high enough. */
function piers(b: Builder, pts: readonly P2[], cum: readonly number[], ys: readonly number[]) {
  const total = cum[cum.length - 1] ?? 0;
  for (let s = PIER_EVERY_M / 2; s < total; s += PIER_EVERY_M) {
    let i = 0;
    while (i + 2 < cum.length && (cum[i + 1] ?? 0) < s) i++;
    const p = pts[i] as P2;
    const q = pts[i + 1] as P2;
    const seg = (cum[i + 1] ?? 0) - (cum[i] ?? 0) || 1;
    const t = (s - (cum[i] ?? 0)) / seg;
    const y = (ys[i] ?? 0) + ((ys[i + 1] ?? 0) - (ys[i] ?? 0)) * t;
    if (y < PIER_FROM_M) continue;
    const x = p.x + (q.x - p.x) * t;
    const z = p.z + (q.z - p.z) * t;
    const h = PIER_HALF_M;
    const ring = [
      { x: x - h, z: z - h },
      { x: x + h, z: z - h },
      { x: x + h, z: z + h },
      { x: x - h, z: z + h },
    ];
    b.ringWalls(ring, 0, y - BEAM_M, 2, 3);
  }
}

function cumulative(pts: readonly P2[]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1] as P2;
    const q = pts[i] as P2;
    cum.push((cum[i - 1] ?? 0) + Math.hypot(q.x - p.x, q.z - p.z));
  }
  return cum;
}

/** One raised road: deck, parapets, fascia and piers. */
export function buildDeck(parts: ChunkedBuilders<RoadPart>, e: RoadEdge, tile: number) {
  const hs = e.heights;
  if (!hs) return;
  const ys = hs.map((h) => h + DECK_Y);
  const mid = e.points[Math.floor(e.points.length / 2)] ?? { x: 0, z: 0 };
  const half = e.widthM / 2 + 0.5;
  slopedStrip(parts.at('asphalt', mid.x, mid.z), e.points, ys, -half, half, tile);
  const white = parts.at('white', mid.x, mid.z);
  const lift = ys.map((y) => y + 0.01);
  slopedStrip(white, e.points, lift, half - 0.75, half - 0.6, 1);
  slopedStrip(white, e.points, lift, -half + 0.6, -half + 0.75, 1);
  const concrete = parts.at('kerb', mid.x, mid.z);
  for (const side of [1, -1]) {
    // Parapet faces both ways (thin wall), the fascia beam faces out.
    sideWall(concrete, e.points, ys, side * (half + PARAPET_T), BEAM_M, PARAPET_M, RAISED_M);
    sideWall(concrete, e.points, ys, side * half, 0, PARAPET_M, RAISED_M, false);
  }
  // Seen from below: the deck's underside.
  const under = ys.map((y) => y - BEAM_M);
  const l = offset(e.points, -half - PARAPET_T);
  const r = offset(e.points, half + PARAPET_T);
  for (let i = 0; i + 1 < e.points.length; i++) {
    if (Math.max(under[i] ?? 0, under[i + 1] ?? 0) < RAISED_M) continue;
    const [ri, rj, lj, li] = [r[i], r[i + 1], l[i + 1], l[i]] as P2[];
    if (!ri || !rj || !lj || !li) continue;
    concrete.quad(
      [li.x, Math.max(0, under[i] ?? 0), li.z],
      [lj.x, Math.max(0, under[i + 1] ?? 0), lj.z],
      [rj.x, Math.max(0, under[i + 1] ?? 0), rj.z],
      [ri.x, Math.max(0, under[i] ?? 0), ri.z],
      [0, -1, 0],
    );
  }
  piers(concrete, e.points, e.cum, ys);
}

/** A viaduct overhead you can't get onto: deck, walls, underside and piers. */
export function buildOverpass(parts: ChunkedBuilders<RoadPart>, o: Overpass, tile: number) {
  if (o.points.length < 2) return;
  const ys = o.points.map(() => o.heightM);
  const mid = o.points[Math.floor(o.points.length / 2)] ?? { x: 0, z: 0 };
  const half = o.widthM / 2;
  slopedStrip(parts.at('asphalt', mid.x, mid.z), o.points, ys, -half, half, tile);
  const concrete = parts.at('kerb', mid.x, mid.z);
  for (const side of [1, -1]) {
    sideWall(concrete, o.points, ys, side * half, BEAM_M, PARAPET_M, 0);
    sideWall(concrete, o.points, ys, side * (half - PARAPET_T), 0, PARAPET_M, 0, false);
  }
  const under = ys.map((y) => y - BEAM_M);
  const l = offset(o.points, -half);
  const r = offset(o.points, half);
  for (let i = 0; i + 1 < o.points.length; i++) {
    const [ri, rj, lj, li] = [r[i], r[i + 1], l[i + 1], l[i]] as P2[];
    if (!ri || !rj || !lj || !li) continue;
    concrete.quad(
      [li.x, under[i] ?? 0, li.z],
      [lj.x, under[i + 1] ?? 0, lj.z],
      [rj.x, under[i + 1] ?? 0, rj.z],
      [ri.x, under[i] ?? 0, ri.z],
      [0, -1, 0],
    );
  }
  piers(concrete, o.points, cumulative(o.points), ys);
}

/** Height of a junction: the highest road end meeting there (0 at grade). */
export function nodeHeight(map: CityMap, id: number): number {
  const n = map.nodes[id];
  let h = 0;
  for (const ei of n?.edges ?? []) {
    const e = map.edges[ei];
    if (!e?.heights) continue;
    h = Math.max(h, (e.a === id ? e.heights[0] : e.heights[e.heights.length - 1]) ?? 0);
  }
  return h;
}

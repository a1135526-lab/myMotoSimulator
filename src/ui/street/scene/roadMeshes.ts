import { roadAt } from '@/application';
import type { CityMap, RoadEdge, RoadNode } from '@/domain';
import type { ChunkedBuilders } from './chunks';
import { band, dashes, kerb, slice, type Line } from './polyline';

/**
 * Roads on the real network: asphalt along each edge, a patch over every
 * junction, lane markings that stop short of junctions, zebra crossings and
 * stop lines at signals, and raised sidewalks with kerbs on bigger roads.
 */

export type RoadPart = 'asphalt' | 'white' | 'yellow' | 'paver' | 'kerb';

export const ROAD_Y = 0.05;
const MARK_Y = 0.06;
export const SIDEWALK_Y = 0.18;
export const ASPHALT_TILE_M = 8;
export const PAVER_TILE_M = 4;
const CROSSWALK_M = 3.5;
const MIN_SIDEWALK_M = 1.5;
const SIDEWALK_PIECE_M = 10;

const isJunction = (n: RoadNode | undefined) => (n?.edges.length ?? 0) >= 3;
const MAJOR = new Set(['primary', 'secondary', 'tertiary', 'unclassified', 'link']);

/** Where the carriageway of the crossing roads ends, from a node. */
const mouth = (n: RoadNode | undefined) => (isJunction(n) ? (n?.radius ?? 0) - 0.5 : 0);

function junctionPatch(parts: ChunkedBuilders<RoadPart>, map: CityMap, n: RoadNode) {
  const r = Math.max(...n.edges.map((id) => (map.edges[id] as RoadEdge).widthM / 2)) + 0.6;
  const ring = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    return { x: n.x + Math.cos(a) * r, z: n.z + Math.sin(a) * r };
  });
  parts.at('asphalt', n.x, n.z).polygon(ring, ROAD_Y, ASPHALT_TILE_M);
}

function markings(parts: ChunkedBuilders<RoadPart>, map: CityMap, e: RoadEdge, line: Line) {
  const na = map.nodes[e.a];
  const nb = map.nodes[e.b];
  const extra = (n: RoadNode | undefined) => (n?.signal ? CROSSWALK_M + 1.5 : 1.5);
  const s0 = isJunction(na) ? mouth(na) + extra(na) : 0;
  const s1 = e.length - (isJunction(nb) ? mouth(nb) + extra(nb) : 0);
  if (s1 - s0 < 3) return;
  const mid = line.points[Math.floor(line.points.length / 2)] ?? { x: 0, z: 0 };
  const white = parts.at('white', mid.x, mid.z);
  const yellow = parts.at('yellow', mid.x, mid.z);
  const half = e.widthM / 2;
  const pts = slice(line, s0, s1);
  if (MAJOR.has(e.cls)) {
    band(white, pts, half - 0.45, half - 0.3, MARK_Y, 1);
    band(white, pts, -half + 0.3, -half + 0.45, MARK_Y, 1);
  }
  const lanes = e.lanesPerDirection;
  if (e.oneway) {
    for (let k = 1; k < lanes; k++) {
      const o = -half + (k * e.widthM) / lanes;
      dashes(white, line, s0, s1, o - 0.075, o + 0.075, MARK_Y, 4, 6);
    }
    return;
  }
  if (lanes >= 2 || e.cls === 'primary' || e.cls === 'secondary') {
    band(yellow, pts, -0.28, -0.12, MARK_Y, 1);
    band(yellow, pts, 0.12, 0.28, MARK_Y, 1);
  } else if (e.cls === 'tertiary' || e.cls === 'unclassified') {
    dashes(yellow, line, s0, s1, -0.075, 0.075, MARK_Y, 4, 4);
  }
  for (let k = 1; k < lanes; k++) {
    const o = (k * half) / lanes;
    dashes(white, line, s0, s1, o - 0.075, o + 0.075, MARK_Y, 4, 6);
    dashes(white, line, s0, s1, -o - 0.075, -o + 0.075, MARK_Y, 4, 6);
  }
}

/** Zebra crossing and stop line where an edge meets a signalled junction. */
function crossing(
  parts: ChunkedBuilders<RoadPart>,
  e: RoadEdge,
  line: Line,
  atStart: boolean,
  n: RoadNode,
) {
  const half = e.widthM / 2;
  const m = mouth(n);
  const [z0, z1] = atStart
    ? [m + 0.3, m + 0.3 + CROSSWALK_M]
    : [e.length - m - 0.3 - CROSSWALK_M, e.length - m - 0.3];
  const pts = slice(line, z0, z1);
  if (pts.length < 2) return;
  const white = parts.at('white', n.x, n.z);
  for (let c = -half + 0.6; c < half - 0.6; c += 1.1) band(white, pts, c, c + 0.55, MARK_Y, 1);
  // Traffic arriving at the node keeps right: at the start of the edge it
  // travels b → a, whose right is the edge's left.
  const [s0, s1] = atStart ? [z1 + 0.8, z1 + 1.2] : [z0 - 1.2, z0 - 0.8];
  if (atStart && e.oneway) return;
  const span: [number, number] = atStart
    ? [-half + 0.3, e.oneway ? half - 0.3 : -0.3]
    : [e.oneway ? -half + 0.3 : 0.3, half - 0.3];
  band(white, slice(line, s0, s1), span[0], span[1], MARK_Y, 1);
}

function sidewalks(parts: ChunkedBuilders<RoadPart>, map: CityMap, e: RoadEdge, line: Line) {
  if (e.sidewalkM < MIN_SIDEWALK_M) return;
  const half = e.widthM / 2;
  const na = map.nodes[e.a];
  const nb = map.nodes[e.b];
  const t0 = isJunction(na) ? (na?.radius ?? 0) : 0;
  const t1 = e.length - (isJunction(nb) ? (nb?.radius ?? 0) : 0);
  for (let s = t0; s < t1; s += SIDEWALK_PIECE_M) {
    const pts = slice(line, s, Math.min(s + SIDEWALK_PIECE_M, t1));
    if (pts.length < 2) continue;
    for (const side of [1, -1] as const) {
      const [a, b] = side > 0 ? [half, half + e.sidewalkM] : [-half - e.sidewalkM, -half];
      // Skip pieces that would sit on another road (dual carriageways, slip roads).
      const p = pts[Math.floor(pts.length / 2)] ?? pts[0];
      const q = pts[Math.min(pts.length - 1, Math.floor(pts.length / 2) + 1)] ?? p;
      if (!p || !q) continue;
      const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
      const nx = (-(q.z - p.z) / len) * side;
      const nz = ((q.x - p.x) / len) * side;
      const off = half + e.sidewalkM / 2;
      const other = roadAt(map, p.x + nx * off, p.z + nz * off);
      if (other && other.edge.id !== e.id) continue;
      band(parts.at('paver', p.x, p.z), pts, a, b, SIDEWALK_Y, PAVER_TILE_M);
      kerb(parts.at('kerb', p.x, p.z), pts, side * half, ROAD_Y, SIDEWALK_Y, side < 0);
    }
  }
}

export function buildRoads(parts: ChunkedBuilders<RoadPart>, map: CityMap) {
  for (const e of map.edges) {
    const line: Line = { points: e.points, cum: e.cum, length: e.length };
    const mid = e.points[Math.floor(e.points.length / 2)] ?? { x: 0, z: 0 };
    band(
      parts.at('asphalt', mid.x, mid.z),
      e.points,
      -e.widthM / 2,
      e.widthM / 2,
      ROAD_Y,
      ASPHALT_TILE_M,
    );
    markings(parts, map, e, line);
    sidewalks(parts, map, e, line);
    const na = map.nodes[e.a];
    const nb = map.nodes[e.b];
    if (na?.signal && isJunction(na)) crossing(parts, e, line, true, na);
    if (nb?.signal && isJunction(nb)) crossing(parts, e, line, false, nb);
  }
  for (const n of map.nodes) if (isJunction(n)) junctionPatch(parts, map, n);
}

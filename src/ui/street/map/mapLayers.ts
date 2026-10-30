import type { AreaKind, Building, CityMap, RoadClass, RoadEdge } from '@/domain';

/**
 * The city prepared for drawing on a 2D canvas: world-space Path2D shapes
 * split into square chunks, so a view only strokes the chunks it can see.
 * Built once per map and cached.
 */

export const CHUNK_M = 400;

export interface Chunk {
  readonly minX: number;
  readonly minZ: number;
  readonly roads: Map<RoadClass, Path2D>;
  readonly areas: Map<AreaKind, Path2D>;
  readonly buildings: Path2D;
  readonly water: Map<number, Path2D>;
}

export interface RoadLabel {
  readonly name: string;
  readonly cls: RoadClass;
  readonly x: number;
  readonly z: number;
  /** Text angle, rad (kept upright). */
  readonly angle: number;
}

export interface MapLayers {
  readonly chunks: Map<string, Chunk>;
  readonly labels: readonly RoadLabel[];
}

const cache = new WeakMap<CityMap, MapLayers>();

const key = (cx: number, cz: number) => `${cx},${cz}`;

function chunkFor(chunks: Map<string, Chunk>, x: number, z: number): Chunk {
  const cx = Math.floor(x / CHUNK_M);
  const cz = Math.floor(z / CHUNK_M);
  const k = key(cx, cz);
  let c = chunks.get(k);
  if (!c) {
    c = {
      minX: cx * CHUNK_M,
      minZ: cz * CHUNK_M,
      roads: new Map(),
      areas: new Map(),
      buildings: new Path2D(),
      water: new Map(),
    };
    chunks.set(k, c);
  }
  return c;
}

function pathIn<K>(m: Map<K, Path2D>, k: K): Path2D {
  let p = m.get(k);
  if (!p) {
    p = new Path2D();
    m.set(k, p);
  }
  return p;
}

const centre = (pts: readonly { x: number; z: number }[]) => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  z: pts.reduce((s, p) => s + p.z, 0) / pts.length,
});

function ring(path: Path2D, pts: readonly { x: number; z: number }[]) {
  pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.z) : path.lineTo(p.x, p.z)));
  path.closePath();
}

function line(path: Path2D, pts: readonly { x: number; z: number }[]) {
  pts.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.z) : path.lineTo(p.x, p.z)));
}

/** One label per road name, on its longest stretch. */
function roadLabels(edges: readonly RoadEdge[]): RoadLabel[] {
  const best = new Map<string, RoadEdge>();
  for (const e of edges) {
    if (!e.name || e.length < 60) continue;
    const prev = best.get(e.name);
    if (!prev || e.length > prev.length) best.set(e.name, e);
  }
  return [...best.values()].map((e) => {
    const i = Math.max(0, Math.floor((e.points.length - 1) / 2));
    const p = e.points[i] ?? { x: 0, z: 0 };
    const q = e.points[i + 1] ?? p;
    let angle = Math.atan2(q.z - p.z, q.x - p.x);
    if (angle > Math.PI / 2) angle -= Math.PI;
    if (angle < -Math.PI / 2) angle += Math.PI;
    return { name: e.name ?? '', cls: e.cls, x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, angle };
  });
}

export function mapLayers(map: CityMap): MapLayers | null {
  if (typeof Path2D === 'undefined') return null;
  const hit = cache.get(map);
  if (hit) return hit;
  const chunks = new Map<string, Chunk>();
  for (const a of map.areas) {
    const c = centre(a.ring);
    ring(pathIn(chunkFor(chunks, c.x, c.z).areas, a.kind), a.ring);
  }
  map.buildings.forEach((b: Building) => {
    const c = centre(b.ring);
    ring(chunkFor(chunks, c.x, c.z).buildings, b.ring);
  });
  for (const w of map.waterways) {
    const c = centre(w.points);
    line(pathIn(chunkFor(chunks, c.x, c.z).water, w.widthM), w.points);
  }
  for (const e of map.edges) {
    const c = centre(e.points);
    line(pathIn(chunkFor(chunks, c.x, c.z).roads, e.cls), e.points);
  }
  const layers = { chunks, labels: roadLabels(map.edges) };
  cache.set(map, layers);
  return layers;
}

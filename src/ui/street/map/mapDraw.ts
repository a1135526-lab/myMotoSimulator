import type { NavView, PlaceResult, StreetView } from '@/application';
import type { AreaKind, CityMap, RoadClass } from '@/domain';
import { CHUNK_M, mapLayers, type RoadLabel } from './mapLayers';

/** Draws the city map (roads, land use, route, rider, traffic) onto a canvas. */

export interface MapViewport {
  /** World point at the canvas centre. */
  readonly cx: number;
  readonly cz: number;
  /** Pixels per metre. */
  readonly scale: number;
  /** Map rotation, rad (0 = north up). */
  readonly rotation: number;
  /** Canvas size in CSS pixels. */
  readonly width: number;
  readonly height: number;
}

export const AREA_FILL: Readonly<Record<AreaKind, string>> = {
  residential: '#252a31',
  commercial: '#2f2b27',
  industrial: '#2b2a34',
  park: '#25452e',
  school: '#3a3045',
  water: '#1d4a66',
  farmland: '#2f3b25',
  pitch: '#2c5236',
  cemetery: '#2b3529',
  military: '#35322b',
};
const WATER = '#1d4a66';
const LAND = '#1c2026';
const BUILDING = '#3a414b';

const ROAD_ORDER: readonly RoadClass[] = [
  'living_street',
  'residential',
  'unclassified',
  'link',
  'tertiary',
  'secondary',
  'primary',
];
export const ROAD_COLOR: Readonly<Record<RoadClass, string>> = {
  primary: '#f5b942',
  secondary: '#f3d27a',
  tertiary: '#f4f1ea',
  unclassified: '#c9ced6',
  link: '#f3d27a',
  residential: '#8c949e',
  living_street: '#7a828c',
};
/** Real carriageway widths, m, with a minimum on screen in px. */
const ROAD_W: Readonly<Record<RoadClass, [number, number]>> = {
  primary: [16, 3.2],
  secondary: [14, 2.8],
  tertiary: [9, 2.2],
  unclassified: [7, 1.6],
  link: [6, 1.6],
  residential: [5.5, 1],
  living_street: [4.5, 0.8],
};

export interface MapExtras {
  readonly view?: StreetView | null;
  readonly nav?: NavView | null;
  readonly pois?: readonly PlaceResult[];
  readonly pin?: { x: number; z: number } | null;
  readonly cars?: boolean;
  readonly labels?: boolean;
}

/** World → screen for this viewport. */
export function toScreen(v: MapViewport, x: number, z: number) {
  const dx = x - v.cx;
  const dz = z - v.cz;
  const c = Math.cos(v.rotation);
  const s = Math.sin(v.rotation);
  return {
    x: v.width / 2 + (dx * c - dz * s) * v.scale,
    y: v.height / 2 + (dx * s + dz * c) * v.scale,
  };
}

/** Screen → world (inverse of {@link toScreen}). */
export function toWorld(v: MapViewport, sx: number, sy: number) {
  const dx = (sx - v.width / 2) / v.scale;
  const dy = (sy - v.height / 2) / v.scale;
  const c = Math.cos(v.rotation);
  const s = Math.sin(v.rotation);
  return { x: v.cx + dx * c + dy * s, z: v.cz - dx * s + dy * c };
}

function drawRoute(ctx: CanvasRenderingContext2D, v: MapViewport, nav: NavView) {
  ctx.beginPath();
  nav.route.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.z) : ctx.lineTo(p.x, p.z)));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9 / v.scale;
  ctx.stroke();
  ctx.strokeStyle = '#2fb4ff';
  ctx.lineWidth = 6 / v.scale;
  ctx.stroke();
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: CityMap,
  v: MapViewport,
  extras: MapExtras = {},
) {
  const layers = mapLayers(map);
  ctx.save();
  ctx.fillStyle = LAND;
  ctx.fillRect(0, 0, v.width, v.height);
  if (!layers) return ctx.restore();
  ctx.translate(v.width / 2, v.height / 2);
  ctx.rotate(v.rotation);
  ctx.scale(v.scale, v.scale);
  ctx.translate(-v.cx, -v.cz);

  const reach = Math.hypot(v.width, v.height) / 2 / v.scale + CHUNK_M;
  const visible = [...layers.chunks.values()].filter(
    (c) =>
      c.minX < v.cx + reach &&
      c.minX + CHUNK_M > v.cx - reach &&
      c.minZ < v.cz + reach &&
      c.minZ + CHUNK_M > v.cz - reach,
  );
  for (const c of visible) {
    for (const [kind, path] of c.areas) {
      ctx.fillStyle = AREA_FILL[kind];
      ctx.fill(path, 'evenodd');
    }
  }
  if (v.scale > 0.45) {
    ctx.fillStyle = BUILDING;
    for (const c of visible) ctx.fill(c.buildings);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = WATER;
  for (const c of visible) {
    for (const [w, path] of c.water) {
      ctx.lineWidth = Math.max(w, 2 / v.scale);
      ctx.stroke(path);
    }
  }
  for (const cls of ROAD_ORDER) {
    const [m, px] = ROAD_W[cls];
    ctx.strokeStyle = ROAD_COLOR[cls];
    ctx.lineWidth = Math.max(m, px / v.scale);
    for (const c of visible) {
      const path = c.roads.get(cls);
      if (path) ctx.stroke(path);
    }
  }
  if (extras.nav) drawRoute(ctx, v, extras.nav);
  ctx.restore();
  drawOverlay(ctx, v, extras, layers.labels);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  v: MapViewport,
  extras: MapExtras,
  labels: readonly RoadLabel[],
) {
  if (extras.labels) {
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const l of labels) {
      const minor =
        l.cls === 'residential' || l.cls === 'living_street' || l.cls === 'unclassified';
      if (minor && v.scale < 1.1) continue;
      if (l.cls === 'tertiary' && v.scale < 0.35) continue;
      const p = toScreen(v, l.x, l.z);
      if (p.x < -60 || p.y < -20 || p.x > v.width + 60 || p.y > v.height + 20) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(l.angle + v.rotation);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgb(10 12 16 / 0.85)';
      ctx.strokeText(l.name, 0, 0);
      ctx.fillStyle = '#f2f4f7';
      ctx.fillText(l.name, 0, 0);
      ctx.restore();
    }
  }
  if (extras.pois) {
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of extras.pois) {
      const s = toScreen(v, p.x, p.z);
      if (s.x < -10 || s.y < -10 || s.x > v.width + 10 || s.y > v.height + 10) continue;
      ctx.fillStyle = 'rgb(16 20 26 / 0.85)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(p.icon, s.x, s.y + 1);
    }
  }
  if (extras.cars && extras.view) {
    ctx.fillStyle = '#ff5d5d';
    for (const c of extras.view.cars) {
      const s = toScreen(v, c.x, c.z);
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(2, 2.2 * v.scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const pin = extras.pin ?? extras.nav?.destination;
  if (pin) drawPin(ctx, toScreen(v, pin.x, pin.z));
  if (extras.view) {
    const r = extras.view.rider;
    const s = toScreen(v, r.x, r.z);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(r.heading + v.rotation);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}

function drawPin(ctx: CanvasRenderingContext2D, p: { x: number; y: number }) {
  ctx.save();
  ctx.fillStyle = '#ff3b5c';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.bezierCurveTo(p.x - 11, p.y - 14, p.x - 9, p.y - 26, p.x, p.y - 26);
  ctx.bezierCurveTo(p.x + 9, p.y - 26, p.x + 11, p.y - 14, p.x, p.y);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x, p.y - 17, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

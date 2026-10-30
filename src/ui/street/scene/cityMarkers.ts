import * as THREE from 'three';
import { pointAlong } from '@/application';
import type { CityMap, PoiKind, RoadEdge } from '@/domain';
import type { Kit } from './cityProps';
import { hash, instanced, matrix } from './roadLayout';
import { SIDEWALK_Y } from './roadMeshes';

/** Traffic signals at the junctions the map says have them, distant hills, and landmark name boards. */

const SIGNAL_CYCLE_S = 30;
/** Stop line distance past the junction mouth, m. */
const STOP_BACK_M = 5;

interface Signal {
  readonly m: THREE.Matrix4;
  /** Which of the junction's two phases it belongs to. */
  readonly group: 0 | 1;
  /** Per-junction offset into the cycle, s. */
  readonly offset: number;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function signalsOf(map: CityMap): Signal[] {
  const out: Signal[] = [];
  for (const n of map.nodes) {
    if (!n.signal || n.edges.length < 3) continue;
    let ref: number | null = null;
    for (const id of n.edges) {
      const e = map.edges[id] as RoadEdge;
      const atStart = e.a === n.id;
      // Traffic arriving here: along b → a at the start of the edge.
      if (atStart && e.oneway) continue;
      const back = Math.min(e.length / 2, n.radius + STOP_BACK_M);
      const p = pointAlong(e, atStart ? back : e.length - back);
      const h = atStart ? p.heading + Math.PI : p.heading;
      ref ??= h;
      const off = e.widthM / 2 + 0.8;
      // On the right of the arriving traffic, lamps facing it.
      const x = p.x - Math.sin(h) * off;
      const z = p.z + Math.cos(h) * off;
      out.push({
        m: matrix(x, SIDEWALK_Y, z, -h),
        group: Math.abs(Math.cos(wrap(h - ref))) > 0.7 ? 0 : 1,
        offset: hash(n.id, 9) * SIGNAL_CYCLE_S,
      });
    }
  }
  return out;
}

/** Traffic signals; returns the per-frame updater that cycles them. */
export function addSignals(kit: Kit, map: CityMap): (clockS: number) => void {
  const { group, keep, mat } = kit;
  const signals = signalsOf(map);
  const sigPole = keep(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8).translate(0, 2.6, 0));
  const sigHead = keep(new THREE.BoxGeometry(0.3, 1.15, 0.42).translate(0, 4.7, 0));
  const darkMetal = mat({ color: '#2b2e33', roughness: 0.55, metalness: 0.4 });
  const sm = signals.map((s) => s.m);
  group.add(instanced(sigPole, darkMetal, sm), instanced(sigHead, darkMetal, sm, false));
  const lampGeo = (y: number) =>
    keep(new THREE.CircleGeometry(0.13, 16).rotateY(-Math.PI / 2).translate(-0.16, y, 0));
  const lights = (['#ff2a1f', '#ffb000', '#22e06b'] as const).map((color, k) => {
    const mesh = instanced(
      lampGeo(5.08 - k * 0.37),
      keep(new THREE.MeshBasicMaterial({ color: '#ffffff' })),
      sm,
      false,
    );
    return { mesh, on: new THREE.Color(color), off: new THREE.Color(color).multiplyScalar(0.12) };
  });
  group.add(...lights.map((l) => l.mesh));

  let tick = -1;
  return (clockS) => {
    // Quarter-second steps are plenty for lights.
    const now = Math.floor(clockS * 4);
    if (now === tick) return;
    tick = now;
    signals.forEach((s, i) => {
      const t = (clockS + s.offset) % SIGNAL_CYCLE_S;
      // 0–12 s group 0 green, 12–15 amber, 15–27 group 1 green, 27–30 amber.
      const mine = s.group === 0 ? t : (t + SIGNAL_CYCLE_S / 2) % SIGNAL_CYCLE_S;
      const state = mine < 12 ? 2 : mine < 15 ? 1 : 0;
      lights.forEach((l, k) => l.mesh.setColorAt(i, k === state ? l.on : l.off));
    });
    for (const l of lights) if (l.mesh.instanceColor) l.mesh.instanceColor.needsUpdate = true;
  };
}

export function addHills(kit: Kit, map: CityMap): void {
  const { group, keep, mat } = kit;
  // Hills to the north and east (大社 / 觀音山 side), fading into the haze.
  const b = map.bounds;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const hills: THREE.Matrix4[] = [];
  for (let k = 0; k < 24; k++) {
    const a = -Math.PI * 0.75 + (k / 23) * Math.PI * 1.1 + (hash(k) - 0.5) * 0.1;
    const r = 3600 + hash(k, 1) * 900;
    const s = 420 + hash(k, 2) * 460;
    hills.push(
      matrix(
        cx + Math.cos(a) * r,
        -40,
        cz + Math.sin(a) * r,
        0,
        s,
        s * (0.25 + hash(k, 3) * 0.2),
        s,
      ),
    );
  }
  group.add(
    instanced(
      keep(new THREE.IcosahedronGeometry(1, 3)),
      mat({ color: '#3d5a3a', roughness: 1 }),
      hills,
      false,
    ),
  );
}

const LABELLED: ReadonlySet<PoiKind> = new Set([
  'station',
  'mrt',
  'university',
  'school',
  'hospital',
]);
const LABEL_COLOR: Partial<Record<PoiKind, string>> = {
  station: '#1565c0',
  mrt: '#d32f2f',
  university: '#6a1b9a',
  school: '#2e7d32',
  hospital: '#c62828',
};

function labelTexture(text: string, bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 88, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 50, 480);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Floating name boards over stations, schools and hospitals. */
export function addLandmarkLabels(kit: Kit, map: CityMap): void {
  const seen = new Set<string>();
  for (const p of map.pois) {
    if (!LABELLED.has(p.kind) || seen.has(p.name)) continue;
    seen.add(p.name);
    const name = p.name.replace(/^高雄市(立|楠梓區)?/, '');
    const tex = kit.keep(labelTexture(name, LABEL_COLOR[p.kind] ?? '#333'));
    const sprite = new THREE.Sprite(
      kit.keep(new THREE.SpriteMaterial({ map: tex, depthWrite: false })),
    );
    sprite.scale.set(26, 4.9, 1);
    sprite.position.set(p.x, 24, p.z);
    kit.group.add(sprite);
  }
}

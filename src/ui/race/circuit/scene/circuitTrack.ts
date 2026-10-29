import * as THREE from 'three';
import {
  asphaltTexture,
  bannerTexture,
  checkerTexture,
  crowdTexture,
  grassTexture,
} from '../../scene/textures';
import { offsetPoint, ribbon, type RibbonSample } from './ribbons';

/** Corners tighter than this radius get kerbs and gravel traps. */
const KERB_RADIUS_M = 260;
const GRAVEL_RADIUS_M = 180;
const KERB_WIDTH_M = 1.1;
const KERB_STRIPE_M = 3;
const BARRIER_STRIPE_M = 10;
const TREE_COUNT = 260;

export interface CircuitTrackInput {
  readonly samples: readonly RibbonSample[];
  readonly halfWidth: number;
  readonly runoffM: number;
  readonly scenery: 'stadium' | 'coast' | 'mountain';
}

export interface CircuitTrack {
  readonly group: THREE.Group;
  /** The five start lights; index 0 is the first to light. */
  readonly startLights: THREE.MeshStandardMaterial[];
  dispose(): void;
}

const RED = new THREE.Color('#d32f2f');
const WHITE = new THREE.Color('#f2f2f2');
const BLUE = new THREE.Color('#1e5aa8');

function bounds(samples: readonly RibbonSample[]) {
  const xs = samples.map((p) => p.x);
  const zs = samples.map((p) => p.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function startGantry(
  p: RibbonSample,
  halfWidth: number,
): { group: THREE.Group; lights: THREE.MeshStandardMaterial[] } {
  const group = new THREE.Group();
  const span = halfWidth + 2;
  const postMat = new THREE.MeshLambertMaterial({ color: '#d0d4da' });
  for (const side of [-1, 1]) {
    const at = offsetPoint(p, side * span);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), postMat);
    post.position.set(at.x, 3.5, at.z);
    group.add(post);
  }
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 2, 1.3),
    new THREE.MeshBasicMaterial({ map: bannerTexture('START / FINISH'), side: THREE.DoubleSide }),
  );
  banner.position.set(p.x, 6.6, p.z);
  // Plane width (local X) must run across the track, along the left vector.
  banner.rotation.y = Math.atan2(-Math.cos(p.heading), -Math.sin(p.heading));
  group.add(banner);

  const lights: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: '#2a0000',
      emissive: '#ff1a1a',
      emissiveIntensity: 0,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat);
    const at = offsetPoint(p, (i - 2) * 0.9);
    bulb.position.set(at.x, 5.6, at.z);
    group.add(bulb);
    lights.push(mat);
  }
  return { group, lights };
}

function trees(input: CircuitTrackInput): THREE.Group {
  const { samples, halfWidth, runoffM } = input;
  const clear = halfWidth + runoffM + 8;
  const spots: { x: number; z: number; s: number }[] = [];
  const coarse = samples.filter((_, i) => i % 8 === 0);
  for (let k = 0; spots.length < TREE_COUNT && k < TREE_COUNT * 4; k++) {
    const p = samples[Math.floor(Math.random() * samples.length)] as RibbonSample;
    const side = Math.random() > 0.5 ? 1 : -1;
    const at = offsetPoint(p, side * (clear + 6 + Math.random() * 70));
    if (coarse.every((c) => Math.hypot(c.x - at.x, c.z - at.z) > clear)) {
      spots.push({ ...at, s: 0.8 + Math.random() * 0.8 });
    }
  }
  const group = new THREE.Group();
  const crown = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.6, 7, 7).translate(0, 5.5, 0),
    new THREE.MeshLambertMaterial({ color: '#2f5d2a' }),
    spots.length,
  );
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.3, 0.4, 2.2, 6).translate(0, 1.1, 0),
    new THREE.MeshLambertMaterial({ color: '#5a4030' }),
    spots.length,
  );
  const m = new THREE.Matrix4();
  spots.forEach((t, i) => {
    m.makeScale(t.s, t.s, t.s).setPosition(t.x, 0, t.z);
    crown.setMatrixAt(i, m);
    trunk.setMatrixAt(i, m);
  });
  group.add(crown, trunk);
  return group;
}

export function buildCircuitTrack(input: CircuitTrackInput): CircuitTrack {
  const { samples, halfWidth: hw, runoffM } = input;
  const group = new THREE.Group();
  const b = bounds(samples);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 800;

  const grass = grassTexture();
  grass.repeat.set(size / 6, size / 6);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshLambertMaterial({ map: grass }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx, -0.05, cz);
  group.add(ground);

  const asphalt = asphaltTexture();
  asphalt.repeat.set(3, 1);
  group.add(
    new THREE.Mesh(
      ribbon(samples, { from: -hw, to: hw, y: 0.02 }),
      new THREE.MeshLambertMaterial({ map: asphalt, side: THREE.DoubleSide }),
    ),
  );

  // Flat ribbons are wound inconsistently between sides; draw both faces.
  const white = new THREE.MeshBasicMaterial({ color: '#eeeeee', side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    group.add(
      new THREE.Mesh(
        ribbon(samples, { from: side * (hw - 0.35), to: side * (hw - 0.15), y: 0.03 }),
        white,
      ),
    );
  }

  const vertexMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const corner = (p: RibbonSample, r: number) => Math.abs(p.curvature) > 1 / r;
  for (const side of [-1, 1]) {
    group.add(
      new THREE.Mesh(
        ribbon(samples, {
          from: side * hw,
          to: side * (hw + KERB_WIDTH_M),
          y: 0.035,
          colorAt: (p) =>
            corner(p, KERB_RADIUS_M) ? (Math.floor(p.s / KERB_STRIPE_M) % 2 ? RED : WHITE) : null,
        }),
        vertexMat,
      ),
    );
    // Gravel on the outside of corners (opposite to the turn direction).
    group.add(
      new THREE.Mesh(
        ribbon(samples, {
          from: side * (hw + KERB_WIDTH_M),
          to: side * (hw + runoffM * 0.7),
          y: 0.01,
          colorAt: (p) =>
            corner(p, GRAVEL_RADIUS_M) && Math.sign(p.curvature) !== side
              ? new THREE.Color('#bfa77a')
              : null,
        }),
        vertexMat,
      ),
    );
    // Air-fence / tyre barrier, striped.
    group.add(
      new THREE.Mesh(
        ribbon(samples, {
          from: side * (hw + runoffM),
          to: 0,
          y: 0,
          wallHeight: 1.4,
          colorAt: (p) => (Math.floor(p.s / BARRIER_STRIPE_M) % 2 ? BLUE : WHITE),
        }),
        vertexMat,
      ),
    );
  }

  const start = samples[0] as RibbonSample;
  const line = new THREE.Mesh(
    ribbon(samples.slice(0, 2), { from: -hw, to: hw, y: 0.04, vScaleM: 1 }),
    new THREE.MeshBasicMaterial({ map: checkerTexture(), side: THREE.DoubleSide }),
  );
  group.add(line);
  const gantry = startGantry(start, hw);
  group.add(gantry.group);

  // Main grandstand along the start straight.
  const crowd = new THREE.MeshLambertMaterial({ map: crowdTexture(), side: THREE.DoubleSide });
  const stand = samples.filter(
    (p, i) => i % 3 === 0 && (p.s < 120 || p.s > (samples[samples.length - 1]?.s ?? 0) - 80),
  );
  for (const p of stand) {
    const at = offsetPoint(p, -(hw + runoffM + 6));
    const block = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6.2), crowd);
    block.position.set(at.x, 2.5, at.z);
    block.rotation.y = -p.heading;
    group.add(block);
  }

  group.add(trees(input));
  if (input.scenery === 'coast') {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 2, size),
      new THREE.MeshLambertMaterial({ color: '#1d4e6f' }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(cx, -0.02, b.maxZ + size / 2 + 60);
    group.add(sea);
  }
  if (input.scenery === 'mountain') {
    const ring = new THREE.InstancedMesh(
      new THREE.ConeGeometry(120, 220, 7).translate(0, 110, 0),
      new THREE.MeshLambertMaterial({ color: '#3b4a3a' }),
      18,
    );
    const m = new THREE.Matrix4();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      ring.setMatrixAt(
        i,
        m.makeTranslation(cx + Math.cos(a) * size * 0.55, 0, cz + Math.sin(a) * size * 0.55),
      );
    }
    group.add(ring);
  }

  return {
    group,
    startLights: gantry.lights,
    dispose: () =>
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of mats) {
            (mat as THREE.MeshBasicMaterial).map?.dispose();
            mat.dispose();
          }
        }
      }),
  };
}

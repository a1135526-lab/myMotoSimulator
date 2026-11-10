import * as THREE from 'three';
import { asphaltTexture, checkerTexture, grassTexture } from '../../scene/textures';
import { ribbon, type RibbonSample } from './ribbons';
import { hilly, terrainMesh, TrackHeights } from './terrain';
import { grandstand, startGantry, trees, type GroundAt } from './trackside';

/** Corners tighter than this radius get kerbs and gravel traps. */
const KERB_RADIUS_M = 260;
const GRAVEL_RADIUS_M = 180;
const KERB_WIDTH_M = 1.1;
const KERB_STRIPE_M = 3;
const BARRIER_STRIPE_M = 10;

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
  /** Road height under any point, for placing bikes and the camera on hills. */
  readonly heights: TrackHeights;
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

export function buildCircuitTrack(input: CircuitTrackInput): CircuitTrack {
  const { samples, halfWidth: hw, runoffM } = input;
  const group = new THREE.Group();
  const b = bounds(samples);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 800;

  const heights = new TrackHeights(samples);
  let groundAt: GroundAt = () => 0;
  if (hilly(samples)) {
    const terrain = terrainMesh(heights, hw + runoffM, cx, cz, size);
    group.add(terrain.mesh);
    groundAt = terrain.heightAt;
  } else {
    const grass = grassTexture();
    grass.repeat.set(size / 6, size / 6);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshLambertMaterial({ map: grass }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, -0.05, cz);
    group.add(ground);
  }

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

  group.add(grandstand(samples, hw, runoffM));
  group.add(trees(samples, hw, runoffM, groundAt));
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
    heights,
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

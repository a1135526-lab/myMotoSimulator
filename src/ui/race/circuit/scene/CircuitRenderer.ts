import * as THREE from 'three';
import type { CameraMode, CircuitView } from '@/application';
import { createBikeModel, createCockpit, type BikeModel } from '../../scene/models';
import { SKY_PRESETS, type SceneTheme } from '../../scene/theme';
import { buildCircuitTrack, type CircuitTrack } from './circuitTrack';
import { TyreSmoke } from './tyreSmoke';

const RIDER_COLORS = ['#ff7a1a', '#1e88e5', '#e53935', '#43a047'];
const EYE_HEIGHT_M = 1.25;
const CHASE_BACK_M = 6.5;
const CHASE_UP_M = 2.4;
const CHASE_LOOK_AHEAD_M = 5;
const CHASE_FOLLOW_PER_S = 7;
/** Onboard camera rolls with the bike, a touch less than the full lean. */
const ONBOARD_ROLL_SHARE = 0.85;
const BASE_FOV = 70;
const FOV_PER_KMH = 0.07;
const MAX_FOV = 88;
const KMH_PER_MPS = 3.6;
const MS_PER_S = 1000;
/** Rear contact patch behind the bike's centre, m. */
const REAR_WHEEL_M = 0.7;
const SMOKE_MIN_DRIFT = 0.25;
/** Onboard camera turns with the sliding body, a share of the slip. */
const ONBOARD_SLIP_SHARE = 0.6;

interface RiderObject {
  readonly yaw: THREE.Group;
  readonly bike: BikeModel;
}

/** Yaw that turns a model facing −Z to travel along heading h (forward = cos h, sin h). */
const yawFor = (heading: number) => Math.atan2(-Math.cos(heading), -Math.sin(heading));

/**
 * Imperative Three.js scene for circuit racing. React mounts it once and calls
 * `render(view, camera)` every animation frame.
 */
export class CircuitRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 3000);
  private readonly cockpit = createCockpit();
  private readonly smoke = new TyreSmoke();
  private track: CircuitTrack | null = null;
  private riders: RiderObject[] = [];
  private readonly chase = new THREE.Vector3();
  private chaseReady = false;
  private lastMs: number | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly theme: Pick<SceneTheme, 'sky' | 'scenery'>,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const sky = SKY_PRESETS[theme.sky];
    this.scene.background = new THREE.Color(sky.background);
    this.scene.fog = new THREE.Fog(sky.background, sky.fogNear * 2, sky.fogFar * 2);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#3b4a2a', sky.hemiIntensity));
    const sun = new THREE.DirectionalLight(sky.sunColor, sky.sunIntensity);
    sun.position.set(...sky.sunPosition);
    this.scene.add(sun);
    this.camera.rotation.order = 'YXZ';
    this.camera.add(this.cockpit);
    this.scene.add(this.camera);
    this.scene.add(this.smoke.group);
    this.resize();
  }

  resize(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(view: CircuitView, mode: CameraMode): void {
    this.ensureTrack(view);
    this.ensureRiders(view);
    const now = performance.now();
    const dt = this.lastMs === null ? 0 : Math.min(0.1, (now - this.lastMs) / MS_PER_S);
    this.lastMs = now;

    view.riders.forEach((r, i) => {
      const obj = this.riders[i];
      if (!obj) return;
      obj.yaw.position.set(r.x, 0, r.z);
      // A left turn lowers the heading, so the nose of a left slide sits at heading − slip.
      obj.yaw.rotation.y = yawFor(r.heading - r.slip);
      obj.bike.group.rotation.z = r.crashed ? Math.PI / 2.2 : r.lean;
      obj.bike.update(r.progressM, r.speedKmh / KMH_PER_MPS);
      if (r.drift > SMOKE_MIN_DRIFT && !r.crashed) {
        const h = r.heading - r.slip;
        const rx = r.x - Math.cos(h) * REAR_WHEEL_M;
        const rz = r.z - Math.sin(h) * REAR_WHEEL_M;
        this.smoke.emit(rx, rz, r.drift, dt);
      }
    });
    this.smoke.update(dt);

    const lit = view.lightsLit;
    this.track?.startLights.forEach((m, i) => (m.emissiveIntensity = i < lit ? 3 : 0));

    const player = view.riders[0];
    if (player) this.placeCamera(player, mode, dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.track?.dispose();
    this.smoke.dispose();
    this.renderer.dispose();
  }

  private placeCamera(p: CircuitView['riders'][number], mode: CameraMode, dt: number): void {
    const fx = Math.cos(p.heading);
    const fz = Math.sin(p.heading);
    const playerObj = this.riders[0];
    if (playerObj) playerObj.yaw.visible = mode === 'third';
    this.cockpit.visible = mode === 'first';
    this.camera.fov = Math.min(MAX_FOV, BASE_FOV + p.speedKmh * FOV_PER_KMH);
    this.camera.updateProjectionMatrix();

    if (mode === 'first') {
      // Head moves out over the inside of the turn as the bike leans.
      const lx = Math.sin(p.heading);
      const lz = -Math.cos(p.heading);
      const side = Math.sin(p.lean) * EYE_HEIGHT_M;
      this.camera.position.set(p.x + lx * side, Math.cos(p.lean) * EYE_HEIGHT_M, p.z + lz * side);
      this.camera.rotation.set(
        -0.04,
        yawFor(p.heading - p.slip * ONBOARD_SLIP_SHARE),
        p.lean * ONBOARD_ROLL_SHARE,
      );
      this.chaseReady = false;
      return;
    }

    const target = new THREE.Vector3(p.x - fx * CHASE_BACK_M, CHASE_UP_M, p.z - fz * CHASE_BACK_M);
    if (!this.chaseReady) {
      this.chase.copy(target);
      this.chaseReady = true;
    } else {
      this.chase.lerp(target, 1 - Math.exp(-dt * CHASE_FOLLOW_PER_S));
    }
    this.camera.position.copy(this.chase);
    this.camera.rotation.set(0, 0, 0);
    this.camera.lookAt(p.x + fx * CHASE_LOOK_AHEAD_M, 0.9, p.z + fz * CHASE_LOOK_AHEAD_M);
  }

  private ensureTrack(view: CircuitView): void {
    if (this.track) return;
    this.track = buildCircuitTrack({
      samples: view.geo.samples,
      halfWidth: view.geo.halfWidth,
      runoffM: view.runoffM,
      scenery: this.theme.scenery,
    });
    this.scene.add(this.track.group);
  }

  private ensureRiders(view: CircuitView): void {
    if (this.riders.length === view.riders.length) return;
    for (const r of this.riders) this.scene.remove(r.yaw);
    this.riders = view.riders.map((r, i) => {
      const bike = createBikeModel(RIDER_COLORS[i % RIDER_COLORS.length] ?? '#ffffff', !r.manual);
      const yaw = new THREE.Group();
      yaw.add(bike.group);
      this.scene.add(yaw);
      return { yaw, bike };
    });
  }
}

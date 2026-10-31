import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { CameraMode, StreetView, TimeOfDay } from '@/application';
import type { CityMap } from '@/domain';
import { TyreSmoke } from '../../race/circuit/scene/tyreSmoke';
import { createBikeModel, createCockpit, type BikeModel } from '../../race/scene/models';
import { CarFleet } from './carFleet';
import { buildCityScene, ROAD_Y, type CityScene } from './cityScene';
import { LIGHTING, type Lighting } from './lighting';
import { RouteMarker } from './routeMarker';

const PLAYER_COLOR = '#ff7a1a';
const EYE_HEIGHT_M = 1.25;
const CHASE_BACK_M = 5.8;
const CHASE_UP_M = 2.2;
const CHASE_LOOK_AHEAD_M = 6;
const CHASE_FOLLOW_PER_S = 6;
const ONBOARD_ROLL_SHARE = 0.85;
const ONBOARD_SLIP_SHARE = 0.6;
const BASE_FOV = 68;
const FOV_PER_KMH = 0.07;
const MAX_FOV = 90;
const KMH_PER_MPS = 3.6;
const MS_PER_S = 1000;
const REAR_WHEEL_M = 0.7;
const SMOKE_MIN_DRIFT = 0.25;
const SHADOW_HALF_M = 70;
/** Draw distance; the haze is thick by then, so far chunks are culled unseen. */
const FAR_M = 2400;
const SUN_DISTANCE_M = 400;
/** Degrees to radians. */
const DEG = Math.PI / 180;

/** Render scale when WebGL runs on the CPU (headless CI, blocked GPU drivers). */
const SOFTWARE_PIXEL_RATIO = 0.5;

const yawFor = (heading: number) => Math.atan2(-Math.cos(heading), -Math.sin(heading));

/** SwiftShader / llvmpipe and friends: WebGL emulated on the CPU. */
function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(
    gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '',
  ).toLowerCase();
  return /swiftshader|llvmpipe|softpipe|software|basic render/.test(name);
}

export class StreetRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, FAR_M);
  private readonly cockpit = createCockpit();
  private readonly smoke = new TyreSmoke();
  private readonly sun: THREE.DirectionalLight;
  private readonly sunDir = new THREE.Vector3();
  private readonly city: CityScene;
  private readonly lighting: Lighting;
  private readonly envTarget: THREE.WebGLRenderTarget;
  private readonly sky = new Sky();
  private readonly route = new RouteMarker();
  private fleet: CarFleet | null = null;
  private fleetKey = '';
  private bike: BikeModel | null = null;
  private bikeKey = '';
  private readonly bikeYaw = new THREE.Group();
  private readonly chase = new THREE.Vector3();
  private chaseReady = false;
  private lastMs: number | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    map: CityMap,
    time: TimeOfDay,
  ) {
    const light = LIGHTING[time];
    this.lighting = light;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    // Without a GPU the whole city is drawn on the CPU; trade sharpness and
    // shadows for a frame rate that still lets the page respond.
    const software = isSoftwareRenderer(this.renderer.getContext());
    this.renderer.setPixelRatio(
      software ? SOFTWARE_PIXEL_RATIO : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = light.exposure;
    this.renderer.shadowMap.enabled = !software;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Physical sky, and the same sky baked into an environment map so
    // glass, paint and chrome reflect it.
    const sky = this.sky;
    // Inside the far plane; it follows the camera so it always surrounds it.
    sky.scale.setScalar(FAR_M * 0.9);
    const u = sky.material.uniforms;
    (u.turbidity as THREE.IUniform<number>).value = light.turbidity;
    (u.rayleigh as THREE.IUniform<number>).value = light.rayleigh;
    (u.mieCoefficient as THREE.IUniform<number>).value = 0.005;
    (u.mieDirectionalG as THREE.IUniform<number>).value = 0.8;
    this.sunDir.setFromSphericalCoords(1, (90 - light.elevationDeg) * DEG, light.azimuthDeg * DEG);
    (u.sunPosition as THREE.IUniform<THREE.Vector3>).value.copy(this.sunDir);
    // At night the sky shader is a murky grey; a dark backdrop reads as night.
    if (light.night >= 1) this.scene.background = new THREE.Color(light.fog);
    else this.scene.add(sky);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.add(sky.clone());
    this.envTarget = pmrem.fromScene(envScene, 0, 1, 20000);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = light.envIntensity;
    pmrem.dispose();

    this.scene.fog = new THREE.FogExp2(light.fog, light.fogDensity);
    this.scene.add(new THREE.HemisphereLight(light.hemiSky, light.hemiGround, light.hemi));
    this.sun = new THREE.DirectionalLight(light.sun, light.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -SHADOW_HALF_M;
    sc.right = SHADOW_HALF_M;
    sc.top = SHADOW_HALF_M;
    sc.bottom = -SHADOW_HALF_M;
    sc.near = 10;
    sc.far = SUN_DISTANCE_M * 2.5;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.03;
    // Under the horizon the "sun" is moonlight from high up instead.
    if (light.elevationDeg < 0)
      this.sunDir.setFromSphericalCoords(1, 40 * DEG, light.azimuthDeg * DEG);
    this.scene.add(this.sun, this.sun.target);

    this.city = buildCityScene(map, time, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.city.group);
    this.scene.add(this.bikeYaw, this.smoke.group, this.route.group);
    this.camera.rotation.order = 'YXZ';
    this.camera.add(this.cockpit);
    this.scene.add(this.camera);
    this.resize();
  }

  resize(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(view: StreetView, mode: CameraMode): void {
    const now = performance.now();
    const dt = this.lastMs === null ? 0 : Math.min(0.1, (now - this.lastMs) / MS_PER_S);
    this.lastMs = now;
    const r = view.rider;

    this.ensureBike(r.manual);
    this.ensureFleet(view);
    this.fleet?.update(view.cars);

    this.route.update(view.nav);
    this.bikeYaw.position.set(r.x, ROAD_Y, r.z);
    this.bikeYaw.rotation.y = yawFor(r.heading - r.slip);
    if (this.bike) {
      this.bike.group.rotation.z = r.crashed ? Math.PI / 2.2 : r.lean;
      this.bike.update(r.distanceM, r.speedKmh / KMH_PER_MPS);
    }
    if (r.drift > SMOKE_MIN_DRIFT && !r.crashed) {
      const h = r.heading - r.slip;
      this.smoke.emit(
        r.x - Math.cos(h) * REAR_WHEEL_M,
        r.z - Math.sin(h) * REAR_WHEEL_M,
        r.drift,
        dt,
      );
    }
    this.smoke.update(dt);
    this.city.update(view.clockS);

    // Keep the shadow map centred on the rider.
    this.sun.target.position.set(r.x, 0, r.z);
    this.sun.position.set(r.x, 0, r.z).addScaledVector(this.sunDir, SUN_DISTANCE_M);

    this.placeCamera(r, mode, dt);
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.city.dispose();
    this.route.dispose();
    this.fleet?.dispose();
    this.smoke.dispose();
    this.envTarget.dispose();
    this.renderer.dispose();
  }

  private ensureBike(manual: boolean): void {
    const key = manual ? 'manual' : 'scooter';
    if (this.bike && this.bikeKey === key) return;
    if (this.bike) this.bikeYaw.remove(this.bike.group);
    this.bike = createBikeModel(PLAYER_COLOR, !manual);
    this.bikeKey = key;
    this.bikeYaw.add(this.bike.group);
  }

  private ensureFleet(view: StreetView): void {
    const key = view.cars.map((c) => `${c.id}${c.kind}`).join(',');
    if (this.fleet && key === this.fleetKey) return;
    if (this.fleet) {
      this.scene.remove(this.fleet.group);
      this.fleet.dispose();
    }
    this.fleet = new CarFleet(view.cars, this.lighting.night);
    this.fleetKey = key;
    this.scene.add(this.fleet.group);
  }

  private placeCamera(p: StreetView['rider'], mode: CameraMode, dt: number): void {
    const fx = Math.cos(p.heading);
    const fz = Math.sin(p.heading);
    this.bikeYaw.visible = mode === 'third';
    this.cockpit.visible = mode === 'first';
    this.camera.fov = Math.min(MAX_FOV, BASE_FOV + p.speedKmh * FOV_PER_KMH);
    this.camera.updateProjectionMatrix();

    if (mode === 'first') {
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
    this.camera.lookAt(p.x + fx * CHASE_LOOK_AHEAD_M, 1.0, p.z + fz * CHASE_LOOK_AHEAD_M);
  }
}

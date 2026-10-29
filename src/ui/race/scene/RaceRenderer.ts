import * as THREE from 'three';
import type { RaceView } from '@/application';
import {
  createBikeModel,
  createCockpit,
  createTree,
  type BikeModel,
  type TreeModel,
} from './models';
import { Rain, roadPoint, SKY_PRESETS, type SceneTheme } from './theme';
import { buildTrack, LANE_OFFSET, type TrackObjects } from './track';

const EYE_HEIGHT_M = 1.3;
const BASE_FOV = 70;
/** FOV widens with speed for a sense of pace (+20° at ~200 km/h). */
const FOV_PER_KMH = 0.1;
const MAX_FOV = 92;
const SHAKE_PER_KMH = 0.00012;
const KMH_PER_MPS = 3.6;
const MS_PER_S = 1000;
const TREE_DISTANCE_M = 6;
const CAMERA_PITCH_SHARE = 0.35;

const PLAYER_X = -LANE_OFFSET;
const OPPONENT_X = LANE_OFFSET;

/**
 * Imperative Three.js scene for the drag race. React mounts it once and calls
 * `render(view)` every animation frame; no React state per frame.
 *
 * Uphill tracks are drawn by tilting the road; bikes, tree and camera are
 * placed with {@link roadPoint} so they sit on it.
 */
export class RaceRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 1500);
  private readonly tree: TreeModel;
  private readonly rain: Rain | null;
  private readonly slope: number;
  private track: TrackObjects | null = null;
  private trackDistance = 0;
  private opponent: BikeModel | null = null;
  private opponentKey = '';
  private lastFrameMs: number | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly theme: SceneTheme,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.slope = Math.atan(theme.gradePercent / 100);

    const sky = SKY_PRESETS[theme.sky];
    this.scene.background = new THREE.Color(sky.background);
    this.scene.fog = new THREE.Fog(sky.background, sky.fogNear, sky.fogFar);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#3b4a2a', sky.hemiIntensity));
    const sun = new THREE.DirectionalLight(sky.sunColor, sky.sunIntensity);
    sun.position.set(...sky.sunPosition);
    this.scene.add(sun);

    this.tree = createTree();
    const treeAt = roadPoint(TREE_DISTANCE_M, theme.gradePercent);
    this.tree.group.position.set(0, treeAt.y, treeAt.z);
    this.scene.add(this.tree.group);

    this.rain = theme.rain ? new Rain() : null;
    if (this.rain) this.scene.add(this.rain.points);

    this.camera.add(createCockpit());
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

  render(view: RaceView): void {
    this.ensureTrack(view.distanceM);
    this.ensureOpponent(view);
    const now = performance.now();
    const dtS = this.lastFrameMs === null ? 0 : (now - this.lastFrameMs) / MS_PER_S;
    this.lastFrameMs = now;

    const { player, opponent } = view;
    const grade = this.theme.gradePercent;
    const speed = player.speedKmh;
    const shake = speed * SHAKE_PER_KMH * (0.3 + player.throttlePct / 100);
    const eye = roadPoint(player.distanceM, grade);
    this.camera.position.set(
      PLAYER_X + (Math.random() - 0.5) * shake,
      eye.y + EYE_HEIGHT_M + (Math.random() - 0.5) * shake,
      eye.z,
    );
    // Pitch with only part of the slope so the road visibly climbs ahead.
    this.camera.rotation.x = this.slope * CAMERA_PITCH_SHARE;
    this.camera.fov = Math.min(MAX_FOV, BASE_FOV + speed * FOV_PER_KMH);
    this.camera.updateProjectionMatrix();

    if (this.opponent) {
      const at = roadPoint(opponent.distanceM, grade);
      this.opponent.group.position.set(OPPONENT_X, at.y, at.z);
      this.opponent.group.rotation.x = this.slope;
      this.opponent.update(opponent.distanceM, opponent.speedKmh / KMH_PER_MPS);
    }
    this.tree.set({
      ambers: view.lights.ambers,
      green: view.lights.green,
      red: [view.redLights.player, view.redLights.opponent],
    });
    this.rain?.update(dtS, this.camera);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.track?.dispose();
    this.rain?.dispose();
    this.renderer.dispose();
  }

  private ensureTrack(distanceM: number): void {
    if (this.track && this.trackDistance === distanceM) return;
    if (this.track) {
      this.scene.remove(this.track.group);
      this.track.dispose();
    }
    this.track = buildTrack(distanceM, {
      scenery: this.theme.scenery,
      night: this.theme.sky === 'night',
    });
    this.track.group.rotation.x = this.slope;
    this.trackDistance = distanceM;
    this.scene.add(this.track.group);
  }

  private ensureOpponent(view: RaceView): void {
    const key = `${view.opponent.label}:${view.opponent.manual}`;
    if (this.opponent && this.opponentKey === key) return;
    if (this.opponent) this.scene.remove(this.opponent.group);
    this.opponent = createBikeModel(
      view.opponent.manual ? '#1e88e5' : '#e53935',
      !view.opponent.manual,
    );
    this.opponentKey = key;
    this.scene.add(this.opponent.group);
  }
}

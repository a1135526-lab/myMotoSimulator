import * as THREE from 'three';
import type { RaceView } from '@/application';
import {
  createBikeModel,
  createCockpit,
  createTree,
  type BikeModel,
  type TreeModel,
} from './models';
import { buildTrack, LANE_OFFSET, type TrackObjects } from './track';

const SKY = '#8fb8de';
const EYE_HEIGHT_M = 1.3;
const BASE_FOV = 70;
/** FOV widens with speed for a sense of pace (+20° at ~200 km/h). */
const FOV_PER_KMH = 0.1;
const MAX_FOV = 92;
const SHAKE_PER_KMH = 0.00012;
const KMH_PER_MPS = 3.6;

const PLAYER_X = -LANE_OFFSET;
const OPPONENT_X = LANE_OFFSET;

/**
 * Imperative Three.js scene for the drag race. React mounts it once and calls
 * `render(view)` every animation frame; no React state per frame.
 */
export class RaceRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 1500);
  private readonly tree: TreeModel;
  private track: TrackObjects | null = null;
  private trackDistance = 0;
  private opponent: BikeModel | null = null;
  private opponentKey = '';

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color(SKY);
    this.scene.fog = new THREE.Fog(SKY, 120, 900);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#3b4a2a', 1.6));
    const sun = new THREE.DirectionalLight('#ffffff', 1.4);
    sun.position.set(-30, 60, 20);
    this.scene.add(sun);

    this.tree = createTree();
    this.tree.group.position.set(0, 0, -6);
    this.scene.add(this.tree.group);

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

    const { player, opponent } = view;
    const speed = player.speedKmh;
    const shake = speed * SHAKE_PER_KMH * (0.3 + player.throttlePct / 100);
    this.camera.position.set(
      PLAYER_X + (Math.random() - 0.5) * shake,
      EYE_HEIGHT_M + (Math.random() - 0.5) * shake,
      -player.distanceM,
    );
    this.camera.fov = Math.min(MAX_FOV, BASE_FOV + speed * FOV_PER_KMH);
    this.camera.updateProjectionMatrix();

    if (this.opponent) {
      this.opponent.group.position.set(OPPONENT_X, 0, -opponent.distanceM);
      this.opponent.update(opponent.distanceM, opponent.speedKmh / KMH_PER_MPS);
    }
    this.tree.set({
      ambers: view.lights.ambers,
      green: view.lights.green,
      red: [view.redLights.player, view.redLights.opponent],
    });

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.track?.dispose();
    this.renderer.dispose();
  }

  private ensureTrack(distanceM: number): void {
    if (this.track && this.trackDistance === distanceM) return;
    if (this.track) {
      this.scene.remove(this.track.group);
      this.track.dispose();
    }
    this.track = buildTrack(distanceM);
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

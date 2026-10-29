import * as THREE from 'three';

/** Visual settings for a venue; physics comes from the track's environment. */
export interface SceneTheme {
  readonly sky: 'day' | 'sunset' | 'night' | 'overcast';
  readonly scenery: 'stadium' | 'coast' | 'mountain';
  readonly rain: boolean;
  readonly gradePercent: number;
}

interface SkyPreset {
  readonly background: string;
  readonly fogNear: number;
  readonly fogFar: number;
  readonly hemiIntensity: number;
  readonly sunColor: string;
  readonly sunIntensity: number;
  readonly sunPosition: readonly [number, number, number];
}

export const SKY_PRESETS: Readonly<Record<SceneTheme['sky'], SkyPreset>> = {
  day: {
    background: '#8fb8de',
    fogNear: 120,
    fogFar: 900,
    hemiIntensity: 1.6,
    sunColor: '#ffffff',
    sunIntensity: 1.4,
    sunPosition: [-30, 60, 20],
  },
  sunset: {
    background: '#e09a78',
    fogNear: 90,
    fogFar: 700,
    hemiIntensity: 1.0,
    sunColor: '#ffb27a',
    sunIntensity: 1.3,
    sunPosition: [-80, 12, -200],
  },
  night: {
    background: '#0b1026',
    fogNear: 40,
    fogFar: 420,
    hemiIntensity: 0.45,
    sunColor: '#9fb4ff',
    sunIntensity: 0.25,
    sunPosition: [20, 50, -40],
  },
  overcast: {
    background: '#8e98a3',
    fogNear: 30,
    fogFar: 320,
    hemiIntensity: 1.1,
    sunColor: '#dfe6ee',
    sunIntensity: 0.5,
    sunPosition: [0, 80, 0],
  },
};

const RAIN_DROPS = 1800;
const RAIN_BOX = { x: 40, y: 18, z: 60 } as const;
const RAIN_FALL_MPS = 14;
/** Each drop is drawn as a short vertical streak, like motion-blurred rain. */
const STREAK_M = 0.45;
/** 2 vertices × xyz per drop. */
const FLOATS_PER_DROP = 6;

/** Falling rain in a box that follows the camera, so it never runs out. */
export class Rain {
  readonly points: THREE.LineSegments;
  private readonly positions: Float32Array;

  constructor() {
    this.positions = new Float32Array(RAIN_DROPS * FLOATS_PER_DROP);
    for (let i = 0; i < RAIN_DROPS; i++) {
      const x = (Math.random() - 0.5) * RAIN_BOX.x;
      const y = Math.random() * RAIN_BOX.y;
      const z = -Math.random() * RAIN_BOX.z;
      this.positions.set([x, y, z, x, y + STREAK_M, z], i * FLOATS_PER_DROP);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.points = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: '#c9d6e3', transparent: true, opacity: 0.45 }),
    );
  }

  /** Drops fall in the camera's frame; the whole box is moved with the camera. */
  update(dtS: number, camera: THREE.Camera): void {
    const fall = RAIN_FALL_MPS * dtS;
    for (let i = 0; i < RAIN_DROPS; i++) {
      const bottom = i * FLOATS_PER_DROP + 1;
      let y = (this.positions[bottom] ?? 0) - fall;
      if (y < 0) y = RAIN_BOX.y;
      this.positions[bottom] = y;
      this.positions[bottom + 3] = y + STREAK_M;
    }
    this.points.geometry.getAttribute('position').needsUpdate = true;
    this.points.position.set(
      camera.position.x,
      camera.position.y - RAIN_BOX.y / 2,
      camera.position.z,
    );
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

/** Position along a straight road climbing at `gradePercent`, starting at the origin. */
export function roadPoint(distanceM: number, gradePercent: number): { y: number; z: number } {
  const angle = Math.atan(gradePercent / 100);
  return { y: distanceM * Math.sin(angle), z: -distanceM * Math.cos(angle) };
}

import { z } from 'zod';
import type { Vec2 } from '@/domain';
import { airDensityAt, type Scenery, type SkyTheme } from '../tracks';

/**
 * Road-racing circuits (fictional). Control points are metres on the ground
 * plane (+z is down the screen seen from above, so these run clockwise —
 * mostly right-handers); the domain turns them into a smooth
 * closed centreline. Grip is for warm race tyres on dry tarmac.
 */
export interface CircuitSpec {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly controlPoints: readonly Vec2[];
  /** Tarmac width, m. */
  readonly widthM: number;
  /** Run-off (grass / gravel) beyond each edge before the barrier, m. */
  readonly runoffM: number;
  /** Tyre grip on this circuit, in g (race tyres ≈ 1.2–1.4). */
  readonly gripG: number;
  readonly altitudeM: number;
  readonly airDensity: number;
  readonly defaultLaps: number;
  readonly sky: SkyTheme;
  readonly scenery: Scenery;
}

const pts = (raw: readonly (readonly [number, number])[]): Vec2[] =>
  raw.map(([x, z]) => ({ x, z }));

const CircuitSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  tagline: z.string().min(1),
  controlPoints: z.array(z.object({ x: z.number(), z: z.number() })).min(6),
  widthM: z.number().min(8).max(20),
  runoffM: z.number().min(5).max(60),
  gripG: z.number().min(0.6).max(1.6),
  altitudeM: z.number().min(0).max(3000),
  airDensity: z.number().min(0.8).max(1.4),
  defaultLaps: z.number().int().min(1).max(10),
  sky: z.enum(['day', 'sunset', 'night', 'overcast']),
  scenery: z.enum(['stadium', 'coast', 'mountain']),
});

const circuit = (c: Omit<CircuitSpec, 'airDensity'>): CircuitSpec => ({
  ...c,
  airDensity: airDensityAt(c.altitudeM),
});

const RAW_CIRCUITS: readonly CircuitSpec[] = [
  circuit({
    id: 'south-bay',
    name: '南灣國際賽車場',
    tagline: '3.4 km 高速賽道・長直線・大半徑高速彎',
    controlPoints: pts([
      [0, 0],
      [350, 0],
      [560, 10],
      [640, 90],
      [620, 200],
      [520, 250],
      [420, 230],
      [340, 280],
      [330, 400],
      [420, 480],
      [600, 470],
      [760, 520],
      [820, 640],
      [760, 760],
      [600, 800],
      [380, 790],
      [200, 720],
      [60, 600],
      [-60, 440],
      [-110, 260],
      [-90, 100],
    ]),
    widthM: 14,
    runoffM: 30,
    gripG: 1.3,
    altitudeM: 20,
    defaultLaps: 3,
    sky: 'day',
    scenery: 'coast',
  }),
  circuit({
    id: 'hill-town',
    name: '山城技術賽道',
    tagline: '2.2 km 技術型・連續彎・海拔 600 m',
    controlPoints: pts([
      [0, 0],
      [240, 0],
      [330, 40],
      [350, 130],
      [290, 190],
      [200, 170],
      [150, 220],
      [170, 320],
      [260, 360],
      [380, 330],
      [460, 380],
      [450, 480],
      [340, 540],
      [180, 520],
      [60, 440],
      [-30, 330],
      [-70, 200],
      [-60, 70],
    ]),
    widthM: 12,
    runoffM: 18,
    gripG: 1.25,
    altitudeM: 600,
    defaultLaps: 3,
    sky: 'sunset',
    scenery: 'mountain',
  }),
  circuit({
    id: 'practice-park',
    name: '練習場',
    tagline: '1.3 km 短程・有髮夾彎・適合熟悉操作',
    controlPoints: pts([
      [0, 0],
      [260, 0],
      [340, 40],
      [350, 120],
      [300, 170],
      [220, 160],
      [170, 200],
      [180, 270],
      [120, 320],
      [30, 310],
      [-40, 250],
      [-60, 140],
      [-40, 50],
    ]),
    widthM: 12,
    runoffM: 20,
    gripG: 1.2,
    altitudeM: 50,
    defaultLaps: 2,
    sky: 'day',
    scenery: 'stadium',
  }),
];

export const CIRCUITS: readonly CircuitSpec[] = RAW_CIRCUITS.map((c) => {
  CircuitSchema.parse(c);
  return c;
});

export const DEFAULT_CIRCUIT_ID = 'practice-park';

export function getCircuit(id: string): CircuitSpec {
  const c = CIRCUITS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown circuit id "${id}"`);
  return c;
}

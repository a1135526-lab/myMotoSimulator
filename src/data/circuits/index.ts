import { z } from 'zod';
import type { ElevationKey, Vec2 } from '@/domain';
import { airDensityAt, type Scenery, type SkyTheme } from '../tracks';
import { HILL_CIRCUITS } from './hillCircuits';
import { ITEM_CIRCUITS } from './itemCircuits';
import { MORE_CIRCUITS } from './moreCircuits';

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
  /** Hills: `[lapFraction, heightM]` keys (see domain elevation.ts); flat when absent. */
  readonly elevation?: readonly ElevationKey[];
  /** Built for item races: only offered there. */
  readonly itemsOnly?: boolean;
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
  elevation: z
    .array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(80)]))
    .min(2)
    .refine((keys) => keys.every((k, i) => i === 0 || k[0] > (keys[i - 1]?.[0] ?? 1)), {
      message: 'elevation keys must run forward round the lap',
    })
    .optional(),
  itemsOnly: z.boolean().optional(),
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
    tagline: '1.7 km 技術型・連續彎・海拔 600 m',
    // prettier-ignore
    controlPoints: pts([[0.0, 0.0], [15.0, 0.0], [30.1, 0.0], [45.1, 0.0], [60.2, 0.0], [75.2, 0.0], [90.3, 0.0], [105.3, 0.0], [120.4, 0.0], [135.4, 0.0], [150.5, 0.0], [165.5, 0.0], [180.6, 0.0], [195.6, 0.0], [210.6, 0.0], [225.7, 0.0], [241.2, 0.3], [256.9, 4.5], [270.5, 13.4], [280.8, 26.0], [286.6, 41.2], [287.7, 57.0], [287.7, 76.8], [287.7, 96.6], [287.7, 116.5], [287.7, 136.3], [287.7, 156.1], [287.7, 176.0], [287.7, 195.8], [287.7, 215.6], [287.7, 235.4], [288.9, 251.8], [295.1, 267.9], [305.9, 281.3], [320.1, 291.2], [332.2, 303.3], [340.0, 318.7], [342.7, 335.7], [342.7, 350.7], [342.7, 365.7], [342.7, 380.7], [342.7, 395.7], [342.7, 410.7], [342.7, 425.7], [342.7, 440.7], [342.7, 455.7], [340.6, 471.7], [334.4, 486.7], [324.6, 499.5], [311.7, 509.4], [296.8, 515.6], [280.7, 517.7], [264.7, 515.6], [249.7, 509.4], [236.9, 499.5], [227.0, 486.7], [219.5, 473.7], [209.5, 456.4], [202.0, 443.4], [194.5, 430.4], [187.0, 417.4], [177.0, 400.1], [166.8, 387.4], [153.2, 378.6], [137.4, 374.4], [122.0, 374.1], [102.0, 374.1], [87.0, 374.1], [67.0, 374.1], [47.0, 374.1], [27.0, 374.1], [9.3, 374.0], [-6.6, 370.6], [-20.7, 362.5], [-31.6, 350.4], [-38.2, 335.5], [-40.0, 317.1], [-40.0, 302.1], [-40.0, 287.1], [-40.0, 272.1], [-40.0, 257.1], [-40.1, 239.3], [-43.5, 223.4], [-51.6, 209.3], [-63.7, 198.5], [-76.8, 188.8], [-86.3, 175.6], [-91.4, 160.1], [-92.0, 142.0], [-92.0, 127.0], [-92.0, 112.0], [-92.0, 92.0], [-92.0, 77.0], [-92.0, 62.0], [-91.7, 46.6], [-87.5, 30.8], [-78.6, 17.2], [-66.0, 7.0], [-50.8, 1.1], [-35.0, -0.0], [-20.0, -0.0], [-5.0, -0.0]]),
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
    tagline: '1.4 km 短程・大半徑髮夾彎・適合熟悉操作',
    // prettier-ignore
    controlPoints: pts([[0.0, 0.0], [19.9, -0.0], [39.8, -0.0], [59.7, -0.0], [79.5, -0.0], [99.4, -0.0], [119.3, -0.0], [139.2, -0.0], [159.1, -0.0], [179.0, -0.0], [198.9, -0.0], [218.7, -0.0], [238.6, -0.0], [258.5, -0.0], [278.4, -0.0], [298.3, -0.0], [318.2, -0.0], [338.1, -0.0], [353.4, 0.3], [369.2, 4.5], [382.8, 13.4], [393.0, 26.0], [398.9, 41.2], [400.0, 57.0], [400.0, 72.0], [400.0, 87.0], [400.0, 102.0], [400.0, 117.0], [400.0, 132.0], [399.7, 148.5], [395.9, 164.2], [388.2, 178.4], [377.0, 190.2], [363.2, 198.6], [347.7, 203.2], [331.5, 203.7], [315.8, 199.9], [301.6, 192.2], [289.8, 181.0], [281.4, 167.2], [276.8, 151.7], [276.0, 132.0], [276.0, 112.0], [273.5, 95.9], [266.1, 81.4], [254.6, 69.9], [240.1, 62.5], [224.0, 60.0], [209.0, 60.0], [194.0, 60.0], [179.0, 60.0], [163.2, 61.1], [148.0, 67.0], [135.4, 77.2], [126.5, 90.8], [122.3, 106.6], [122.0, 122.0], [122.0, 137.0], [120.9, 152.8], [115.0, 168.0], [104.8, 180.6], [91.2, 189.5], [75.4, 193.7], [60.0, 194.0], [45.0, 194.0], [30.0, 194.0], [15.0, 194.0], [-0.0, 194.0], [-15.0, 194.0], [-30.8, 192.9], [-46.0, 187.0], [-58.6, 176.8], [-67.5, 163.2], [-71.7, 147.4], [-72.0, 132.0], [-72.0, 117.0], [-72.0, 102.0], [-72.0, 87.0], [-72.0, 72.0], [-72.0, 57.0], [-70.9, 41.2], [-65.0, 26.0], [-54.8, 13.4], [-41.2, 4.5], [-25.4, 0.3], [-10.0, -0.0]]),
    widthM: 12,
    runoffM: 20,
    gripG: 1.2,
    altitudeM: 50,
    defaultLaps: 2,
    sky: 'day',
    scenery: 'stadium',
  }),
  ...MORE_CIRCUITS.map(circuit),
  ...HILL_CIRCUITS.map(circuit),
  ...ITEM_CIRCUITS.map(circuit),
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

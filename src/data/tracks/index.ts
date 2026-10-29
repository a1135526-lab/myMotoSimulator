import { z } from 'zod';
import type { Environment } from '@/domain';

/**
 * Drag-strip venues. Each changes the physics (distance, grip, air density
 * from altitude, grade) and the look of the 3D scene. Venues are fictional;
 * the condition numbers are typical values, not measurements of real tracks.
 */
export type SkyTheme = 'day' | 'sunset' | 'night' | 'overcast';
export type Scenery = 'stadium' | 'coast' | 'mountain';

export interface TrackSpec {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  /** null = the player picks the distance. */
  readonly distanceM: number | null;
  readonly environment: Environment;
  readonly sky: SkyTheme;
  readonly scenery: Scenery;
  readonly rain: boolean;
  readonly altitudeM: number;
}

/** ISA air density at altitude h (m), 15 °C sea-level standard. */
export const airDensityAt = (altitudeM: number): number =>
  1.225 * Math.pow(1 - 2.25577e-5 * altitudeM, 4.2559);

const TrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  tagline: z.string().min(1),
  distanceM: z.number().int().min(50).max(3000).nullable(),
  environment: z.object({
    airDensity: z.number().min(0.8).max(1.4),
    gradePercent: z.number().min(-15).max(15),
    tractionG: z.number().min(0.3).max(1.5),
  }),
  sky: z.enum(['day', 'sunset', 'night', 'overcast']),
  scenery: z.enum(['stadium', 'coast', 'mountain']),
  rain: z.boolean(),
  altitudeM: z.number().min(0).max(4000),
});

const track = (
  t: Omit<TrackSpec, 'environment'> & { grade?: number; grip?: number },
): TrackSpec => {
  const { grade = 0, grip = 1, ...rest } = t;
  return {
    ...rest,
    environment: { airDensity: airDensityAt(t.altitudeM), gradePercent: grade, tractionG: grip },
  };
};

const RAW_TRACKS: readonly TrackSpec[] = [
  track({
    id: 'central-speedway',
    name: '中央賽車場',
    tagline: '標準零四・白天・看台滿座',
    distanceM: 402,
    sky: 'day',
    scenery: 'stadium',
    rain: false,
    altitudeM: 50,
  }),
  track({
    id: 'coastal-night',
    name: '海線夜間公路',
    tagline: '201 m 短程・夜間・海風',
    distanceM: 201,
    sky: 'night',
    scenery: 'coast',
    rain: false,
    altitudeM: 5,
    grip: 0.95,
  }),
  track({
    id: 'mountain-climb',
    name: '山區爬坡',
    tagline: '1000 m・上坡 4%・海拔 1,200 m 空氣稀薄',
    distanceM: 1000,
    sky: 'sunset',
    scenery: 'mountain',
    rain: false,
    altitudeM: 1200,
    grade: 4,
    grip: 0.9,
  }),
  track({
    id: 'wet-strip',
    name: '雨天濕地',
    tagline: '402 m・路面濕滑・抓地力只剩 6 成',
    distanceM: 402,
    sky: 'overcast',
    scenery: 'stadium',
    rain: true,
    altitudeM: 50,
    grip: 0.6,
  }),
  track({
    id: 'custom',
    name: '自訂賽道',
    tagline: '自己決定距離（50～3000 m）',
    distanceM: null,
    sky: 'day',
    scenery: 'stadium',
    rain: false,
    altitudeM: 50,
  }),
];

export const TRACKS: readonly TrackSpec[] = RAW_TRACKS.map((t) => {
  TrackSchema.parse(t);
  return t;
});

export const DEFAULT_TRACK_ID = 'central-speedway';

export function getTrack(id: string): TrackSpec {
  const t = TRACKS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown track id "${id}"`);
  return t;
}

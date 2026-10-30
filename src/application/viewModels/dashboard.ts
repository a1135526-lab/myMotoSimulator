import type { BikeSpec, ClusterLayout } from '@/domain';

const RPM_ROUND = 1000;
/** Tach scale runs this far past the rev limit when the bike doesn't say. */
const TACH_HEADROOM = 1.1;
const SPEED_ROUND_KMH = 20;
/** Analog speedo top as a share over the bike's real top speed. */
const SPEEDO_HEADROOM = 1.3;
const DEFAULT_TOP_KMH = { scooter: 120, manual: 180 } as const;

/** Everything the dash needs that doesn't change while riding. */
export interface DashboardModel {
  readonly layout: ClusterLayout;
  readonly lcd: 'positive' | 'negative';
  readonly accent: string;
  readonly tachMaxRpm: number;
  readonly redlineRpm: number;
  readonly speedMaxKmh: number;
  readonly brand: string;
  readonly manual: boolean;
}

/** Live values shown on the dash. */
export interface DashboardReadings {
  readonly speedKmh: number;
  readonly rpm: number;
  /** "N", "1"… on manual bikes; null on scooters. */
  readonly gearLabel: string | null;
  readonly engineRunning: boolean;
  readonly revLimiter: boolean;
  readonly tripKm: number;
}

export function dashboardModel(
  bike: BikeSpec,
  redlineRpm: number = bike.engine.revLimitRpm,
): DashboardModel {
  const c = bike.cluster;
  const top = bike.referencePerformance?.topSpeedKmh ?? DEFAULT_TOP_KMH[bike.kind];
  return {
    layout: c?.layout ?? (bike.kind === 'manual' ? 'analog-lcd' : 'lcd-bar'),
    lcd: c?.lcd ?? 'negative',
    accent: c?.accent ?? '#dff1ff',
    tachMaxRpm:
      c?.tachMaxRpm ??
      Math.ceil((Math.max(redlineRpm, bike.engine.revLimitRpm) * TACH_HEADROOM) / RPM_ROUND) *
        RPM_ROUND,
    redlineRpm,
    speedMaxKmh:
      c?.speedMaxKmh ?? Math.ceil((top * SPEEDO_HEADROOM) / SPEED_ROUND_KMH) * SPEED_ROUND_KMH,
    brand: bike.brand,
    manual: bike.kind === 'manual',
  };
}

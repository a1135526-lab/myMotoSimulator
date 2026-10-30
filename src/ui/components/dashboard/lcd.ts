import type { DashboardModel, DashboardReadings } from '@/application';
import { SHIFT_LIGHT_SHARE, type LampState } from './geometry';

/** Colours of one LCD: panel, lit and unlit segments, small print. */
export interface LcdColors {
  readonly bg: string;
  readonly bgEdge: string;
  readonly on: string;
  readonly off: string;
  readonly dim: string;
  readonly red: string;
}

export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${Math.round(a * 100)}%)`;
}

const INK = '#15190f';

export function lcdColors(model: DashboardModel): LcdColors {
  if (model.lcd === 'positive') {
    // Backlit panel, dark liquid-crystal segments.
    return {
      bg: model.accent,
      bgEdge: alpha(model.accent, 0.7),
      on: INK,
      off: alpha(INK, 0.07),
      dim: alpha(INK, 0.65),
      red: '#a3160d',
    };
  }
  return {
    bg: '#04070a',
    bgEdge: '#010203',
    on: model.accent,
    off: alpha(model.accent, 0.07),
    dim: alpha(model.accent, 0.6),
    red: '#ff3b30',
  };
}

export interface LayoutProps {
  readonly m: DashboardModel;
  readonly r: DashboardReadings;
  readonly lamps: LampState;
}

export function lampState(m: DashboardModel, r: DashboardReadings): LampState {
  return {
    neutral: r.gearLabel === 'N',
    stalled: !r.engineRunning,
    shift: r.rpm >= m.redlineRpm * SHIFT_LIGHT_SHARE,
    limiter: r.revLimiter,
  };
}

/** Tach scale labels every 1000 rpm, or every 2000 on long scales. */
export const labelStepRpm = (tachMax: number) => (tachMax > 14000 ? 2000 : 1000);

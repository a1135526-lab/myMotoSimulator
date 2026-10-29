import type { SeriesKey } from '@/application';

/** CSS custom properties so the palette lives in one place (global.css). */
export const SERIES_COLOR: Record<SeriesKey, string> = {
  stock: 'var(--series-stock)',
  current: 'var(--series-current)',
  compare: 'var(--series-compare)',
};

export interface SeriesInfo {
  readonly key: SeriesKey;
  readonly label: string;
}

export const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 11 };
export const GRID_STROKE = 'var(--border)';
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text)' },
};

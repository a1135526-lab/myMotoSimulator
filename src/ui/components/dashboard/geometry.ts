/** Plain helpers shared by the cluster layouts (kept apart from components for fast refresh). */

/** Width a {@link SevenSeg} row takes, for right-aligning. */
export const sevenSegWidth = (digits: number, size: number) =>
  digits * (size * 0.55 + size * 0.18) - size * 0.18;

export const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

export function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const p = polar(cx, cy, r, fromDeg);
  const q = polar(cx, cy, r, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  const sweep = toDeg > fromDeg ? 1 : 0;
  return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
}

/** 24 h wall clock, as on every real dash. */
export function clockText(now: Date = new Date()): string {
  const h = String(now.getHours()).padStart(2, ' ');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}${m}`;
}

/** Shift light comes on at this share of the redline. */
export const SHIFT_LIGHT_SHARE = 0.92;

export interface LampState {
  readonly neutral: boolean;
  readonly stalled: boolean;
  readonly shift: boolean;
  readonly limiter: boolean;
}

import styles from './dashboard.module.css';
import { clockText, type LampState } from './geometry';

/**
 * Drawing pieces shared by every cluster: seven-segment LCD digits (with the
 * faint unlit segments a real LCD shows), dial geometry and warning lamps.
 */

//   a
// f   b
//   g
// e   c
//   d
const SEGMENTS: Readonly<Record<string, string>> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  // Gear displays draw neutral as an "n" with a roof.
  N: 'abcef',
  ' ': '',
};

/** One segment as a hexagon centred at (cx, cy). */
function hexagon(cx: number, cy: number, len: number, t: number, vertical: boolean): string {
  const h = len / 2;
  const w = t / 2;
  const pts = vertical
    ? [
        [cx, cy - h],
        [cx + w, cy - h + w],
        [cx + w, cy + h - w],
        [cx, cy + h],
        [cx - w, cy + h - w],
        [cx - w, cy - h + w],
      ]
    : [
        [cx - h, cy],
        [cx - h + w, cy - w],
        [cx + h - w, cy - w],
        [cx + h, cy],
        [cx + h - w, cy + w],
        [cx - h + w, cy + w],
      ];
  return pts.map(([x, y]) => `${(x ?? 0).toFixed(2)},${(y ?? 0).toFixed(2)}`).join(' ');
}

function segmentShapes(w: number, h: number, t: number): Record<string, string> {
  const gap = t * 0.25;
  const hx = w - t - gap * 2;
  const vy = h / 2 - t / 2 - gap * 2;
  const top = t / 2;
  const mid = h / 2;
  const bottom = h - t / 2;
  const upper = (top + mid) / 2;
  const lower = (mid + bottom) / 2;
  return {
    a: hexagon(w / 2, top, hx, t, false),
    g: hexagon(w / 2, mid, hx, t, false),
    d: hexagon(w / 2, bottom, hx, t, false),
    f: hexagon(t / 2, upper, vy, t, true),
    b: hexagon(w - t / 2, upper, vy, t, true),
    e: hexagon(t / 2, lower, vy, t, true),
    c: hexagon(w - t / 2, lower, vy, t, true),
  };
}

interface SevenSegProps {
  /** Characters to draw; right-aligned into `digits` cells. */
  readonly text: string;
  readonly digits: number;
  readonly x: number;
  readonly y: number;
  /** Cell height; width follows at 0.55 × height. */
  readonly size: number;
  readonly on: string;
  readonly off: string;
  /** Italic slant of the digits, degrees. */
  readonly skew?: number;
}

/** A row of seven-segment digits, right-aligned like a speedo readout. */
export function SevenSeg({ text, digits, x, y, size, on, off, skew = -8 }: SevenSegProps) {
  const w = size * 0.55;
  const t = size * 0.13;
  const pitch = w + size * 0.18;
  const shapes = segmentShapes(w, size, t);
  const chars = text.padStart(digits, ' ').slice(-digits).split('');
  return (
    <g transform={`translate(${x} ${y}) skewX(${skew})`} aria-hidden>
      {chars.map((ch, i) => {
        const lit = SEGMENTS[ch] ?? '';
        return (
          <g key={i} transform={`translate(${i * pitch} 0)`}>
            {Object.entries(shapes).map(([seg, pts]) => (
              <polygon key={seg} points={pts} fill={lit.includes(seg) ? on : off} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

interface ReadoutProps {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly on: string;
  readonly off: string;
}

const PITCH = 0.73;
const DIGIT_W = 0.55;
const SLANT = Math.tan((8 * Math.PI) / 180);

/** Wall clock, HH:MM, with the colon in its own gap. */
export function LcdClock({ x, y, size, on, off }: ReadoutProps) {
  const text = clockText();
  const gap = size * 0.4;
  const mmX = x + 2 * size * PITCH + gap;
  const colonX = (x + size * PITCH + size * DIGIT_W + mmX) / 2;
  const dot = size * 0.09;
  return (
    <g>
      <SevenSeg text={text.slice(0, 2)} digits={2} x={x} y={y} size={size} on={on} off={off} />
      <SevenSeg text={text.slice(2)} digits={2} x={mmX} y={y} size={size} on={on} off={off} />
      <circle cx={colonX - SLANT * size * 0.3} cy={y + size * 0.3} r={dot} fill={on} />
      <circle cx={colonX - SLANT * size * 0.72} cy={y + size * 0.72} r={dot} fill={on} />
    </g>
  );
}

/** Trip meter, 0.0–999.9 km. Returns its width via the layout's own spacing. */
export function LcdTrip({ km, x, y, size, on, off }: ReadoutProps & { km: number }) {
  const whole = String(Math.floor(km) % 1000);
  const tenth = String(Math.floor(km * 10) % 10);
  const gap = size * 0.3;
  const decX = x + 3 * size * PITCH + gap;
  return (
    <g>
      <SevenSeg text={whole} digits={3} x={x} y={y} size={size} on={on} off={off} />
      <circle
        cx={decX - gap / 2 - SLANT * size}
        cy={y + size - size * 0.07}
        r={size * 0.08}
        fill={on}
      />
      <SevenSeg text={tenth} digits={1} x={decX} y={y} size={size} on={on} off={off} />
    </g>
  );
}

/** Warning / indicator lamps along the top of a cluster. */
export function Lamps({
  x,
  y,
  width,
  state,
}: {
  x: number;
  y: number;
  width: number;
  state: LampState;
}) {
  const step = width / 5;
  const at = (i: number) => x + step * (i + 0.5);
  return (
    <g aria-hidden>
      {/* turn signals */}
      <path d={`M ${at(0) - 6} ${y} l 7 -5 v 3 h 5 v 4 h -5 v 3 z`} className={styles.lampOff} />
      <path d={`M ${at(4) + 6} ${y} l -7 -5 v 3 h -5 v 4 h 5 v 3 z`} className={styles.lampOff} />
      {/* neutral */}
      <text x={at(1)} y={y + 4} className={state.neutral ? styles.lampNeutral : styles.lampOffText}>
        N
      </text>
      {/* shift light */}
      <circle
        cx={at(2)}
        cy={y}
        r={5}
        className={
          state.limiter ? styles.lampShiftFlash : state.shift ? styles.lampShift : styles.lampOff
        }
      />
      {/* engine check */}
      <path
        d={`M ${at(3) - 7} ${y - 3} h 4 v -2 h 6 v 2 h 2 l 2 2 v 5 h -2 l -2 2 h -8 l -2 -2 z`}
        className={state.stalled ? styles.lampAmber : styles.lampOff}
      />
    </g>
  );
}

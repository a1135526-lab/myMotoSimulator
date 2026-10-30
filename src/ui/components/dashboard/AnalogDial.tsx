import styles from './dashboard.module.css';
import { arcPath, polar } from './geometry';

interface AnalogDialProps {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly value: number;
  readonly max: number;
  readonly majorStep: number;
  /** Label = value / divisor (1000 for a tach). */
  readonly divisor: number;
  readonly redFrom: number | null;
  readonly caption: string;
  readonly needle: string;
  readonly startDeg?: number;
  readonly sweepDeg?: number;
}

/** Black-faced needle gauge with a chrome ring, as on an analog dash. */
export function AnalogDial({
  id,
  cx,
  cy,
  r,
  value,
  max,
  majorStep,
  divisor,
  redFrom,
  caption,
  needle,
  startDeg = 135,
  sweepDeg = 270,
}: AnalogDialProps) {
  const deg = (v: number) => startDeg + (Math.min(max, Math.max(0, v)) / max) * sweepDeg;
  const majors = Math.floor(max / majorStep);
  const minorStep = majorStep / 2;
  const minors = Math.floor(max / minorStep);

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9edf1" />
          <stop offset="0.5" stopColor="#6f767e" />
          <stop offset="1" stopColor="#2b3035" />
        </linearGradient>
        <radialGradient id={`${id}-face`} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#1a1e23" />
          <stop offset="1" stopColor="#050607" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r + 5} fill={`url(#${id}-ring)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-face)`} />
      {redFrom !== null && (
        <path
          d={arcPath(cx, cy, r - 6, deg(redFrom), deg(max))}
          stroke="#e0281c"
          strokeWidth={7}
          fill="none"
        />
      )}
      {Array.from({ length: minors + 1 }, (_, i) => {
        const v = i * minorStep;
        const major = i % 2 === 0;
        const a = polar(cx, cy, r - 3, deg(v));
        const b = polar(cx, cy, r - (major ? 13 : 8), deg(v));
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={redFrom !== null && v >= redFrom ? '#ff6a5e' : '#f3f5f7'}
            strokeWidth={major ? 2 : 1}
          />
        );
      })}
      {Array.from({ length: majors + 1 }, (_, i) => {
        const v = i * majorStep;
        const p = polar(cx, cy, r - 24, deg(v));
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            className={redFrom !== null && v >= redFrom ? styles.dialNumRed : styles.dialNum}
          >
            {v / divisor}
          </text>
        );
      })}
      <text x={cx} y={cy + r * 0.42} className={styles.label} fill="#9aa3ad" textAnchor="middle">
        {caption}
      </text>
      <g transform={`rotate(${deg(value).toFixed(2)} ${cx} ${cy})`}>
        <polygon
          points={`${cx - 10},${cy - 2.2} ${cx + r - 8},${cy - 0.8} ${cx + r - 8},${cy + 0.8} ${cx - 10},${cy + 2.2}`}
          fill={needle}
          style={{ filter: `drop-shadow(0 0 3px ${needle})` }}
        />
      </g>
      <circle cx={cx} cy={cy} r={8} fill="#22262b" stroke="#555c64" />
    </g>
  );
}

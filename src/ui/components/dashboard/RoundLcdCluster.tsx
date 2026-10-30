import styles from './dashboard.module.css';
import { labelStepRpm, lcdColors, type LayoutProps } from './lcd';
import { arcPath, polar, sevenSegWidth } from './geometry';
import { Lamps, LcdClock, LcdTrip, SevenSeg } from './parts';

const C = 110;
const START_DEG = 135;
const SWEEP_DEG = 270;
const RPM_PER_SEG = 500;
const R_IN = 72;
const R_OUT = 84;
const FUEL_SEGS = 5;

function sector(fromDeg: number, toDeg: number, rIn: number, rOut: number): string {
  const a = polar(C, C, rOut, fromDeg);
  const b = polar(C, C, rOut, toDeg);
  const d = polar(C, C, rIn, toDeg);
  const e = polar(C, C, rIn, fromDeg);
  return `M${a.x},${a.y} A${rOut},${rOut} 0 0 1 ${b.x},${b.y} L${d.x},${d.y} A${rIn},${rIn} 0 0 0 ${e.x},${e.y} Z`;
}

/**
 * Round retro LCD in a chrome bezel (SYM MMBCU): a ring of tach segments
 * around a big segment speed readout.
 */
export function RoundLcdCluster({ m, r, lamps }: LayoutProps) {
  const c = lcdColors(m);
  const segs = Math.round(m.tachMaxRpm / RPM_PER_SEG);
  const segDeg = SWEEP_DEG / segs;
  const step = labelStepRpm(m.tachMaxRpm) * 2;
  const speedSize = 44;

  return (
    <svg viewBox="0 0 220 220" aria-hidden>
      <defs>
        <linearGradient id="round-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.45" stopColor="#8d949c" />
          <stop offset="0.55" stopColor="#c8ced4" />
          <stop offset="1" stopColor="#50565d" />
        </linearGradient>
        <radialGradient id="round-glow" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor={c.bg} />
          <stop offset="1" stopColor={c.bgEdge} />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={106} fill="url(#round-chrome)" />
      <circle cx={C} cy={C} r={97} fill="#111417" />
      <circle cx={C} cy={C} r={90} fill="url(#round-glow)" />

      {Array.from({ length: segs }, (_, i) => {
        const rpmAt = (i + 0.5) * RPM_PER_SEG;
        const red = rpmAt >= m.redlineRpm;
        const lit = r.rpm >= rpmAt;
        const from = START_DEG + i * segDeg + 0.8;
        return (
          <path
            key={i}
            d={sector(from, from + segDeg - 1.6, R_IN, R_OUT)}
            fill={lit ? (red ? c.red : c.on) : c.off}
          />
        );
      })}
      {Array.from({ length: Math.floor(m.tachMaxRpm / step) + 1 }, (_, i) => {
        const p = polar(C, C, 63, START_DEG + ((i * step) / m.tachMaxRpm) * SWEEP_DEG);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y + 2.5}
            className={styles.scaleNum}
            fill={i * step >= m.redlineRpm ? c.red : c.dim}
          >
            {(i * step) / 1000}
          </text>
        );
      })}

      <Lamps x={72} y={64} width={76} state={lamps} />
      <SevenSeg
        text={String(Math.floor(r.speedKmh))}
        digits={3}
        x={C - sevenSegWidth(3, speedSize) / 2 + 3}
        y={72}
        size={speedSize}
        on={c.on}
        off={c.off}
      />
      <text x={C} y={128} className={styles.label} fill={c.dim} textAnchor="middle">
        km/h
      </text>
      <LcdClock x={92} y={134} size={11} on={c.on} off={c.off} />
      <text x={78} y={162} className={styles.label} fill={c.dim}>
        TRIP
      </text>
      <LcdTrip km={r.tripKm} x={98} y={154} size={10} on={c.on} off={c.off} />
      {Array.from({ length: FUEL_SEGS }, (_, i) => {
        const from = 64 + i * 10.5;
        return <path key={i} d={sector(from, from + 8.5, R_IN, R_OUT)} fill={c.on} />;
      })}
      <path d={arcPath(C, C, 99, 200, 340)} stroke="#fff" strokeOpacity="0.12" fill="none" />
    </svg>
  );
}

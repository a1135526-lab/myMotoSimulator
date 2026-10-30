import styles from './dashboard.module.css';
import { labelStepRpm, lcdColors, type LayoutProps } from './lcd';
import { sevenSegWidth } from './geometry';
import { Lamps, LcdClock, LcdTrip, SevenSeg } from './parts';

const RPM_PER_BAR = 250;
const BAR_X0 = 38;
const BAR_X1 = 322;
const BAR_BASE_Y = 84;
const BAR_MIN_H = 7;
const BAR_RISE_H = 30;
const FUEL_BARS = 6;

/**
 * Monochrome LCD dash of a modern scooter or small sport bike (SYM JET SL /
 * DRG, Yamaha R15 / R3 / MT-15 / Force / Cygnus): a bar-graph tach that
 * climbs across the top, big segment speed, gear, clock, trip and fuel.
 */
export function LcdBarCluster({ m, r, lamps }: LayoutProps) {
  const c = lcdColors(m);
  const bars = Math.min(64, Math.round(m.tachMaxRpm / RPM_PER_BAR));
  const pitch = (BAR_X1 - BAR_X0) / bars;
  const step = labelStepRpm(m.tachMaxRpm);
  const speedRight = m.manual ? 262 : 300;
  const speedSize = 50;

  return (
    <svg viewBox="0 0 360 172" aria-hidden>
      <defs>
        <linearGradient id="lcdbar-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#30343a" />
          <stop offset="1" stopColor="#0b0d10" />
        </linearGradient>
        <radialGradient id="lcdbar-glow" cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor={c.bg} />
          <stop offset="1" stopColor={c.bgEdge} />
        </radialGradient>
        <linearGradient id="lcdbar-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M14 34 Q14 12 38 10 L322 10 Q346 12 346 34 L338 142 Q334 164 310 166 L50 166 Q26 164 22 142 Z"
        fill="url(#lcdbar-bezel)"
        stroke="#454a51"
      />
      <Lamps x={80} y={24} width={200} state={lamps} />
      <rect x="26" y="38" width="308" height="118" rx="9" fill="url(#lcdbar-glow)" />

      {/* Tach bar graph */}
      {Array.from({ length: bars }, (_, i) => {
        const rpmAt = (i + 0.5) * RPM_PER_BAR;
        const red = rpmAt >= m.redlineRpm;
        const lit = r.rpm >= rpmAt;
        const h = BAR_MIN_H + BAR_RISE_H * Math.pow(i / bars, 1.5);
        const x = BAR_X0 + i * pitch;
        return (
          <polygon
            key={i}
            points={`${x},${BAR_BASE_Y} ${x + 2},${BAR_BASE_Y - h} ${x + pitch * 0.72 + 2},${BAR_BASE_Y - h} ${x + pitch * 0.72},${BAR_BASE_Y}`}
            fill={lit ? (red ? c.red : c.on) : red ? `${c.red}33` : c.off}
          />
        );
      })}
      {Array.from({ length: Math.floor(m.tachMaxRpm / step) + 1 }, (_, i) => {
        const x = BAR_X0 + ((i * step) / RPM_PER_BAR) * pitch;
        return (
          <text
            key={i}
            x={x}
            y={BAR_BASE_Y + 9}
            className={styles.scaleNum}
            fill={i * step >= m.redlineRpm ? c.red : c.dim}
          >
            {(i * step) / 1000}
          </text>
        );
      })}
      <text x={322} y={46} className={styles.label} fill={c.dim} textAnchor="end">
        ×1000 r/min
      </text>

      {/* Speed */}
      <SevenSeg
        text={String(Math.floor(r.speedKmh))}
        digits={3}
        x={speedRight - sevenSegWidth(3, speedSize)}
        y={98}
        size={speedSize}
        on={c.on}
        off={c.off}
      />
      <text x={speedRight + 2} y={150} className={styles.label} fill={c.dim}>
        km/h
      </text>

      {/* Gear position */}
      {m.manual && (
        <g>
          <rect x={282} y={98} width={42} height={52} rx={4} fill="none" stroke={c.dim} />
          <text x={303} y={107} className={styles.label} fill={c.dim} textAnchor="middle">
            GEAR
          </text>
          <SevenSeg
            text={r.gearLabel ?? ' '}
            digits={1}
            x={295}
            y={112}
            size={32}
            on={r.gearLabel === 'N' ? '#2bff6a' : c.on}
            off={c.off}
          />
        </g>
      )}

      {/* Clock, trip, fuel */}
      <LcdClock x={40} y={100} size={13} on={c.on} off={c.off} />
      <text x={40} y={127} className={styles.label} fill={c.dim}>
        TRIP
      </text>
      <LcdTrip km={r.tripKm} x={58} y={120} size={11} on={c.on} off={c.off} />
      <text x={40} y={150} className={styles.label} fill={c.dim}>
        E
      </text>
      {Array.from({ length: FUEL_BARS }, (_, i) => (
        <rect key={i} x={48 + i * 9} y={143} width={6} height={8} fill={c.on} />
      ))}
      <text x={104} y={150} className={styles.label} fill={c.dim}>
        F
      </text>

      <rect x="26" y="38" width="308" height="118" rx="9" fill="url(#lcdbar-glass)" />
      <text x={180} y={163} className={styles.label} fill="#7b828b" textAnchor="middle">
        {m.brand}
      </text>
    </svg>
  );
}

import { AnalogDial } from './AnalogDial';
import styles from './dashboard.module.css';
import { lcdColors, type LayoutProps } from './lcd';
import { sevenSegWidth } from './geometry';
import { Lamps, LcdClock, LcdTrip, SevenSeg } from './parts';

const FUEL_BARS = 6;

/**
 * Sport-bike dash with a needle tachometer and an LCD block beside it for
 * speed, gear, clock, trip and fuel (Kawasaki Ninja 400).
 */
export function AnalogLcdCluster({ m, r, lamps }: LayoutProps) {
  const c = lcdColors(m);
  const speedSize = 40;
  const speedRight = 330;

  return (
    <svg viewBox="0 0 360 196" aria-hidden>
      <defs>
        <linearGradient id="alcd-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c3035" />
          <stop offset="1" stopColor="#0a0c0e" />
        </linearGradient>
        <linearGradient id="alcd-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.bg} />
          <stop offset="1" stopColor={c.bgEdge} />
        </linearGradient>
      </defs>
      <path
        d="M20 40 Q22 12 60 8 L330 18 Q352 22 350 46 L344 160 Q340 186 312 188 L60 190 Q18 186 14 150 Z"
        fill="url(#alcd-bezel)"
        stroke="#454a51"
      />
      <AnalogDial
        id="alcd-tach"
        cx={106}
        cy={104}
        r={80}
        value={r.rpm}
        max={m.tachMaxRpm}
        majorStep={m.tachMaxRpm > 14000 ? 2000 : 1000}
        divisor={1000}
        redFrom={m.redlineRpm}
        caption="×1000 r/min"
        needle="#ff6b1a"
        startDeg={150}
        sweepDeg={250}
      />
      <Lamps x={200} y={34} width={140} state={lamps} />

      <rect x={200} y={48} width={138} height={124} rx={6} fill="url(#alcd-glow)" />
      <SevenSeg
        text={String(Math.floor(r.speedKmh))}
        digits={3}
        x={speedRight - sevenSegWidth(3, speedSize)}
        y={58}
        size={speedSize}
        on={c.on}
        off={c.off}
      />
      <text x={speedRight} y={108} className={styles.label} fill={c.dim} textAnchor="end">
        km/h
      </text>
      <text x={210} y={64} className={styles.label} fill={c.dim}>
        GEAR
      </text>
      <SevenSeg
        text={r.gearLabel ?? ' '}
        digits={1}
        x={212}
        y={70}
        size={30}
        on={c.on}
        off={c.off}
      />
      <LcdClock x={212} y={118} size={13} on={c.on} off={c.off} />
      <text x={262} y={128} className={styles.label} fill={c.dim}>
        TRIP
      </text>
      <LcdTrip km={r.tripKm} x={280} y={118} size={11} on={c.on} off={c.off} />
      <text x={212} y={162} className={styles.label} fill={c.dim}>
        E
      </text>
      {Array.from({ length: FUEL_BARS }, (_, i) => (
        <rect key={i} x={221 + i * 11} y={150} width={8} height={12 + i} fill={c.on} />
      ))}
      <text x={290} y={162} className={styles.label} fill={c.dim}>
        F
      </text>
      <text x={186} y={184} className={styles.label} fill="#7b828b" textAnchor="middle">
        {m.brand}
      </text>
    </svg>
  );
}

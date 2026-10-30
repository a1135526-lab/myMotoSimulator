import { AnalogDial } from './AnalogDial';
import styles from './dashboard.module.css';
import { lcdColors, type LayoutProps } from './lcd';
import { Lamps, LcdClock, LcdTrip } from './parts';

const FUEL_BARS = 6;
const TEMP_BARS = 4;

/**
 * Maxi-scooter dash: analog speedometer and tachometer either side of a centre
 * screen with clock, trip, fuel and temperature (Yamaha XMAX / TMAX).
 */
export function TwinAnalogCluster({ m, r, lamps }: LayoutProps) {
  const c = lcdColors({ ...m, lcd: 'negative' });
  const speedStep = m.speedMaxKmh > 180 ? 40 : 20;

  return (
    <svg viewBox="0 0 400 186" aria-hidden>
      <defs>
        <linearGradient id="twin-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f3338" />
          <stop offset="1" stopColor="#090b0d" />
        </linearGradient>
      </defs>
      <path
        d="M10 92 Q10 12 86 10 L314 10 Q390 12 390 92 Q390 176 314 178 L86 178 Q10 176 10 92 Z"
        fill="url(#twin-bezel)"
        stroke="#454a51"
      />
      <AnalogDial
        id="twin-speed"
        cx={88}
        cy={94}
        r={72}
        value={r.speedKmh}
        max={m.speedMaxKmh}
        majorStep={speedStep}
        divisor={1}
        redFrom={null}
        caption="km/h"
        needle="#ff3d2e"
      />
      <AnalogDial
        id="twin-tach"
        cx={312}
        cy={94}
        r={72}
        value={r.rpm}
        max={m.tachMaxRpm}
        majorStep={1000}
        divisor={1000}
        redFrom={m.redlineRpm}
        caption="×1000 r/min"
        needle="#ff3d2e"
      />
      <Lamps x={160} y={30} width={80} state={lamps} />
      <rect x={166} y={44} width={68} height={108} rx={6} fill={c.bg} stroke="#2a2f35" />
      <LcdClock x={176} y={52} size={14} on={c.on} off={c.off} />
      <text x={174} y={86} className={styles.label} fill={c.dim}>
        TRIP
      </text>
      <LcdTrip km={r.tripKm} x={176} y={90} size={13} on={c.on} off={c.off} />
      <text x={226} y={102} className={styles.label} fill={c.dim} textAnchor="end">
        km
      </text>
      {Array.from({ length: FUEL_BARS }, (_, i) => (
        <rect key={i} x={174 + i * 8} y={120} width={6} height={9} fill={c.on} />
      ))}
      <text x={226} y={128} className={styles.label} fill={c.dim} textAnchor="end">
        F
      </text>
      {Array.from({ length: TEMP_BARS }, (_, i) => (
        <rect key={i} x={174 + i * 8} y={136} width={6} height={9} fill={i < 2 ? c.on : c.off} />
      ))}
      <text x={226} y={144} className={styles.label} fill={c.dim} textAnchor="end">
        H
      </text>
      <text x={200} y={170} className={styles.label} fill="#7b828b" textAnchor="middle">
        {m.brand}
      </text>
    </svg>
  );
}

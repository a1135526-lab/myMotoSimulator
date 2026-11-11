import styles from './dashboard.module.css';
import { arcPath, polar } from './geometry';
import { gearText, NEUTRAL_GREEN, type LayoutProps } from './lcd';
import { Lamps } from './parts';

const CX = 205;
const CY = 172;
const R = 104;
const BAND = 16;
/** 0 just below the pivot on the left, round over the top to the top speed on the right. */
const FROM_DEG = 188;
const TO_DEG = 342;
const RED_FROM_KMH = 100;
const NEEDLE = '#f2a900';
const FUEL_X = 74;
const FUEL_Y = 104;
const ODO_DIGITS = 5;

function sector(fromDeg: number, toDeg: number, rIn: number, rOut: number): string {
  const a = polar(CX, CY, rOut, fromDeg);
  const b = polar(CX, CY, rOut, toDeg);
  const c = polar(CX, CY, rIn, toDeg);
  const d = polar(CX, CY, rIn, fromDeg);
  return `M${a.x},${a.y} A${rOut},${rOut} 0 0 1 ${b.x},${b.y} L${c.x},${c.y} A${rIn},${rIn} 0 0 0 ${d.x},${d.y} Z`;
}

/**
 * KYMCO K1: a shield-shaped dash in a silver bezel. The speedometer is a
 * printed band (white, red from 100) swept by a yellow needle, with a
 * mechanical odometer drum, a needle fuel gauge on the left and a small
 * window for the gear.
 */
export function K1Cluster({ m, r, lamps }: LayoutProps) {
  const top = m.speedMaxKmh;
  const deg = (kmh: number) =>
    FROM_DEG + (Math.min(top, Math.max(0, kmh)) / top) * (TO_DEG - FROM_DEG);
  const neutral = r.gearLabel === 'N';
  const odo = String(Math.floor(r.tripKm * 10) % 10 ** ODO_DIGITS).padStart(ODO_DIGITS, '0');
  const steps = Math.floor(top / 10);
  const end = polar(CX, CY, R - BAND / 2, TO_DEG);

  return (
    <svg viewBox="0 0 400 230" aria-hidden>
      <defs>
        <linearGradient id="k1-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9cdd2" />
          <stop offset="0.5" stopColor="#7d838a" />
          <stop offset="1" stopColor="#3c4146" />
        </linearGradient>
        <pattern id="k1-diamond" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M3 0 L6 3 L3 6 L0 3 Z" fill="#ffffff" fillOpacity="0.05" />
        </pattern>
      </defs>
      <path
        d="M24 46 Q30 14 80 12 L320 12 Q370 14 376 46 L366 150 Q356 214 290 218 L110 218 Q44 214 34 150 Z"
        fill="url(#k1-bezel)"
      />
      <path
        d="M40 56 Q46 32 90 30 L310 30 Q354 32 360 56 L350 148 Q340 202 284 204 L116 204 Q60 202 50 148 Z"
        fill="#1b1e22"
      />
      <path
        d="M40 56 Q46 32 90 30 L310 30 Q354 32 360 56 L350 148 Q340 202 284 204 L116 204 Q60 202 50 148 Z"
        fill="url(#k1-diamond)"
      />
      <text x={200} y={24} className={styles.k1Brand}>
        KYMCO
      </text>

      {/* Printed speed band: white, then red */}
      {Array.from({ length: steps }, (_, i) => {
        const from = deg(i * 10) + 0.8;
        const to = deg((i + 1) * 10) - 0.8;
        const red = i * 10 >= RED_FROM_KMH;
        return (
          <path key={i} d={sector(from, to, R - BAND, R)} fill={red ? '#e2442f' : '#f2f2f2'} />
        );
      })}
      {/* …and the red stripe running on to the right edge */}
      <path
        d={`M${end.x} ${end.y - BAND / 2} L346 ${end.y + 4} L344 ${end.y + 12} L${end.x} ${end.y + BAND / 2} Z`}
        fill="#e2442f"
      />
      {Array.from({ length: Math.floor(top / 20) + 1 }, (_, i) => {
        const p = polar(CX, CY, R - BAND - 13, deg(i * 20));
        return (
          <text key={i} x={p.x} y={p.y} className={styles.k1Num}>
            {i * 20}
          </text>
        );
      })}
      <text x={CX} y={CY + 22} className={styles.label} fill="#cfd3d8" textAnchor="middle">
        km/h
      </text>

      {/* Odometer drum and the gear window */}
      {Array.from(odo, (ch, i) => (
        <g key={i}>
          <rect
            x={CX - 44 + i * 15}
            y={CY - 50}
            width={13}
            height={18}
            rx={1.5}
            fill={i === ODO_DIGITS - 1 ? '#f2f2f2' : '#050607'}
            stroke="#5c6168"
          />
          <text
            x={CX - 37.5 + i * 15}
            y={CY - 40.5}
            className={styles.k1Odo}
            fill={i === ODO_DIGITS - 1 ? '#111' : '#f2f2f2'}
          >
            {ch}
          </text>
        </g>
      ))}
      <rect x={CX + 26} y={CY - 11} width={22} height={22} rx={3} fill="#0a0b0d" stroke={NEEDLE} />
      <text
        x={CX + 37}
        y={CY + 0.5}
        className={styles.k1Odo}
        fill={neutral ? NEUTRAL_GREEN : NEEDLE}
      >
        {gearText(r)}
      </text>

      {/* Fuel gauge */}
      <path
        d={arcPath(FUEL_X, FUEL_Y, 40, 228, 312)}
        stroke="#f2f2f2"
        strokeWidth={7}
        fill="none"
      />
      <path
        d={arcPath(FUEL_X, FUEL_Y, 40, 228, 246)}
        stroke="#e2442f"
        strokeWidth={7}
        fill="none"
      />
      <text x={FUEL_X + 32} y={FUEL_Y - 34} className={styles.label} fill="#f2f2f2">
        F
      </text>
      <line
        x1={FUEL_X}
        y1={FUEL_Y}
        x2={polar(FUEL_X, FUEL_Y, 44, 292).x}
        y2={polar(FUEL_X, FUEL_Y, 44, 292).y}
        stroke={NEEDLE}
        strokeWidth={2.4}
      />
      <circle cx={FUEL_X} cy={FUEL_Y} r={7} fill="#0d0f11" stroke="#3a3f45" />

      <Lamps x={278} y={70} width={68} state={lamps} />

      {/* Needle */}
      <g transform={`rotate(${deg(r.speedKmh).toFixed(2)} ${CX} ${CY})`}>
        <polygon
          points={`${CX - 8},${CY - 2.2} ${CX + R - 10},${CY - 0.8} ${CX + R - 10},${CY + 0.8} ${CX - 8},${CY + 2.2}`}
          fill={NEEDLE}
          style={{ filter: `drop-shadow(0 0 2px ${NEEDLE})` }}
        />
      </g>
      <circle cx={CX} cy={CY} r={10} fill="#0d0f11" stroke="#3a3f45" />
    </svg>
  );
}

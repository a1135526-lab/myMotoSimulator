import styles from './dashboard.module.css';
import { arcPath, polar } from './geometry';
import { gearText, NEUTRAL_GREEN, type LayoutProps } from './lcd';
import { Lamps, LcdTrip, SevenSeg } from './parts';

const CX = 168;
const CY = 122;
const R = 70;
/** 0 just left of the bottom, sweeping clockwise up to the top speed at about one o'clock. */
const FROM_DEG = 112;
const TO_DEG = 300;
const ORANGE = '#ff6a1f';
const LCD_BG = '#e9a43a';
const LCD_ON = '#2a1a06';
const LCD_OFF = '#2a1a0612';
const FUEL_X = 296;
const FUEL_Y = 70;

/**
 * SYM DUKE (迪爵): a dark grey dotted face in a hexagonal housing, white
 * printed speedometer with an orange needle, an amber LCD for the gear and
 * the odometer, and a needle fuel gauge up on the right.
 */
export function DukeCluster({ m, r, lamps }: LayoutProps) {
  const top = m.speedMaxKmh;
  const deg = (kmh: number) =>
    FROM_DEG + (Math.min(top, Math.max(0, kmh)) / top) * (TO_DEG - FROM_DEG);
  const neutral = r.gearLabel === 'N';

  return (
    <svg viewBox="0 0 360 230" aria-hidden>
      <defs>
        <pattern id="duke-dots" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="0.9" fill="#ffffff" fillOpacity="0.09" />
        </pattern>
        <linearGradient id="duke-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5058" />
          <stop offset="1" stopColor="#2b3036" />
        </linearGradient>
      </defs>
      <path
        d="M58 30 L300 18 Q344 18 350 60 L346 168 Q340 214 290 220 L74 222 Q26 216 14 172 L8 92 Q10 40 58 30 Z"
        fill="#131518"
      />
      <path
        d="M64 40 L296 30 Q334 30 338 64 L334 164 Q328 204 286 208 L78 210 Q36 204 26 168 L20 96 Q22 50 64 40 Z"
        fill="url(#duke-face)"
        stroke="#9aa1a8"
        strokeOpacity="0.5"
      />
      <path
        d="M64 40 L296 30 Q334 30 338 64 L334 164 Q328 204 286 208 L78 210 Q36 204 26 168 L20 96 Q22 50 64 40 Z"
        fill="url(#duke-dots)"
      />

      {/* Printed speedometer: black band, white ticks and numbers */}
      <path
        d={arcPath(CX, CY, R + 4, FROM_DEG, TO_DEG)}
        stroke="#0d0f11"
        strokeWidth={4}
        fill="none"
      />
      {Array.from({ length: Math.floor(top / 10) + 1 }, (_, i) => {
        const v = i * 10;
        const major = v % 20 === 0;
        const a = polar(CX, CY, R, deg(v));
        const b = polar(CX, CY, R - (major ? 16 : 9), deg(v));
        return (
          <line
            key={v}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#f4f4f2"
            strokeWidth={major ? 3.2 : 1.6}
          />
        );
      })}
      {Array.from({ length: Math.floor(top / 20) + 1 }, (_, i) => {
        const v = i * 20;
        const p = polar(CX, CY, R + 15, deg(v));
        return (
          <text key={v} x={p.x} y={p.y} className={styles.dukeNum}>
            {v}
          </text>
        );
      })}
      <text x={CX} y={CY - 44} className={styles.label} fill="#e8eaec" textAnchor="middle">
        km/h
      </text>

      {/* Amber LCD: gear on the left, odometer on the right */}
      <rect x={CX - 38} y={CY - 38} width={76} height={22} rx={2} fill={LCD_BG} />
      <SevenSeg
        text={gearText(r)}
        digits={1}
        x={CX - 33}
        y={CY - 35}
        size={18}
        on={neutral ? '#0d6b2a' : LCD_ON}
        off={LCD_OFF}
      />
      <LcdTrip km={r.tripKm} x={CX - 18} y={CY - 33} size={13} on={LCD_ON} off={LCD_OFF} />

      {/* Fuel: F / E with a needle */}
      <path
        d={arcPath(FUEL_X, FUEL_Y, 22, 180, 270)}
        stroke="#f4f4f2"
        strokeWidth={3}
        fill="none"
      />
      <path
        d={arcPath(FUEL_X, FUEL_Y, 22, 165, 180)}
        stroke="#ff3b30"
        strokeWidth={3}
        fill="none"
      />
      <text x={FUEL_X - 6} y={FUEL_Y - 26} className={styles.label} fill="#f4f4f2">
        F
      </text>
      <text x={FUEL_X - 28} y={FUEL_Y + 14} className={styles.label} fill="#ff3b30">
        E
      </text>
      <line
        x1={FUEL_X}
        y1={FUEL_Y}
        x2={polar(FUEL_X, FUEL_Y, 22, 248).x}
        y2={polar(FUEL_X, FUEL_Y, 22, 248).y}
        stroke={ORANGE}
        strokeWidth={2.4}
      />
      <circle cx={FUEL_X} cy={FUEL_Y} r={5} fill="#16181b" />

      <Lamps x={232} y={172} width={84} state={lamps} />
      {neutral && (
        <text x={CX} y={CY + 30} className={styles.label} fill={NEUTRAL_GREEN} textAnchor="middle">
          NEUTRAL
        </text>
      )}

      {/* Needle */}
      <g transform={`rotate(${deg(r.speedKmh).toFixed(2)} ${CX} ${CY})`}>
        <polygon
          points={`${CX - 10},${CY - 2} ${CX + R - 6},${CY - 0.8} ${CX + R - 6},${CY + 0.8} ${CX - 10},${CY + 2}`}
          fill={ORANGE}
          style={{ filter: `drop-shadow(0 0 3px ${ORANGE})` }}
        />
      </g>
      <circle cx={CX} cy={CY} r={9} fill="#16181b" stroke="#3a3f45" />
    </svg>
  );
}

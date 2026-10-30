import styles from './dashboard.module.css';
import { polar, sevenSegWidth } from './geometry';
import type { LayoutProps } from './lcd';
import { Lamps, LcdClock, SevenSeg } from './parts';

const CX = 150;
const CY = 168;
const FACE_R = 122;
/** Tick ring: 0 at about eight o'clock round to the top limit at four o'clock. */
const FROM_DEG = 148;
const TO_DEG = 392;
const R_OUT = 114;
const R_MAJOR = 97;
const R_MINOR = 105;
const R_NUM = 85;
const YELLOW = '#d6ff3c';
const WHITE = '#f4f6f6';
const UNLIT = '#2b2f33';
const RED = '#ff3a24';
const FUEL_BARS = 7;

/**
 * SYM JET SL: a round black LCD in a shield-shaped housing. The tachometer is
 * a ring of tick segments (0–12, red from 9) that light up with the revs; the
 * centre has a yellow clock, big white speed, yellow odometer (TOTAL) and a
 * fuel bar along the bottom.
 */
export function TickRingCluster({ m, r, lamps }: LayoutProps) {
  const top = Math.ceil(m.tachMaxRpm / 1000);
  const deg = (rpm: number) => FROM_DEG + (rpm / (top * 1000)) * (TO_DEG - FROM_DEG);
  const speedSize = 56;
  const odo = String(Math.floor(r.tripKm));

  return (
    <svg viewBox="0 0 300 330" aria-hidden>
      <defs>
        <linearGradient id="tick-housing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2d31" />
          <stop offset="0.6" stopColor="#141618" />
          <stop offset="1" stopColor="#0b0c0d" />
        </linearGradient>
        <radialGradient id="tick-face" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#0c0f12" />
          <stop offset="1" stopColor="#030405" />
        </radialGradient>
        <linearGradient id="tick-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Shield housing: wide round top, tapering to the badge at the bottom. */}
      <path
        d="M150 6 C 236 6 296 62 296 160 C 296 236 252 286 196 306 Q 150 324 104 306 C 48 286 4 236 4 160 C 4 62 64 6 150 6 Z"
        fill="url(#tick-housing)"
        stroke="#3d4248"
        strokeWidth={1.5}
      />
      <Lamps x={95} y={24} width={110} state={lamps} />
      <circle cx={CX} cy={CY} r={FACE_R + 4} fill="#1d2023" />
      <circle cx={CX} cy={CY} r={FACE_R} fill="url(#tick-face)" />

      {/* Tick-segment tachometer */}
      {Array.from({ length: top * 2 + 1 }, (_, i) => {
        const rpm = i * 500;
        const major = i % 2 === 0;
        const red = rpm >= m.redlineRpm;
        const lit = r.rpm >= rpm - 250 && r.rpm > 0;
        const a = polar(CX, CY, R_OUT, deg(rpm));
        const b = polar(CX, CY, major ? R_MAJOR : R_MINOR, deg(rpm));
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={lit ? (red ? RED : WHITE) : red ? '#4a1611' : UNLIT}
            strokeWidth={major ? 4 : 2.6}
            strokeLinecap="round"
          />
        );
      })}
      {Array.from({ length: top + 1 }, (_, i) => {
        const p = polar(CX, CY, R_NUM, deg(i * 1000));
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            className={i * 1000 >= m.redlineRpm ? styles.ringNumRed : styles.ringNum}
          >
            {i}
          </text>
        );
      })}
      {/* Limiter block at the end of the scale */}
      <path
        d={`M ${polar(CX, CY, R_OUT, TO_DEG + 3).x} ${polar(CX, CY, R_OUT, TO_DEG + 3).y} L ${polar(CX, CY, R_MAJOR, TO_DEG + 3).x} ${polar(CX, CY, R_MAJOR, TO_DEG + 3).y}`}
        stroke={lamps.limiter || lamps.shift ? RED : '#4a1611'}
        strokeWidth={9}
        className={lamps.limiter ? styles.tftFlash : undefined}
      />

      <text x={CX} y={100} className={styles.ringUnit}>
        ×1000/rpm
      </text>

      {/* Clock */}
      <g transform="translate(104 120)">
        <circle cx={0} cy={0} r={6} fill="none" stroke={YELLOW} strokeWidth={1.6} />
        <path d="M0 -3.5 V0 H3" stroke={YELLOW} strokeWidth={1.4} fill="none" />
      </g>
      <LcdClock x={116} y={110} size={20} on={YELLOW} off="#ffffff08" />
      <line x1={80} y1={138} x2={220} y2={138} stroke="#cfd4d8" strokeWidth={1.2} />

      {/* Speed */}
      <SevenSeg
        text={String(Math.floor(r.speedKmh))}
        digits={3}
        x={196 - sevenSegWidth(3, speedSize)}
        y={144}
        size={speedSize}
        on={WHITE}
        off="#ffffff08"
      />
      <text x={203} y={196} className={styles.ringUnitLeft}>
        km/h
      </text>
      <line x1={78} y1={208} x2={222} y2={208} stroke="#cfd4d8" strokeWidth={1.2} />

      {/* Odometer */}
      <SevenSeg
        text={odo}
        digits={5}
        x={190 - sevenSegWidth(5, 22)}
        y={214}
        size={22}
        on={YELLOW}
        off="#ffffff08"
      />
      <text x={194} y={234} className={styles.ringOdo}>
        km
      </text>
      <text x={150} y={248} className={styles.ringTotal}>
        TOTAL
      </text>

      {/* Fuel: F on the left, reserve in red at the right */}
      <text x={72} y={266} className={styles.ringUnitLeft}>
        F
      </text>
      {Array.from({ length: FUEL_BARS }, (_, i) => (
        <path
          key={i}
          d={`M ${84 + i * 17} 266 l 2.5 -9 h 12 l -2.5 9 z`}
          fill={i === FUEL_BARS - 1 ? RED : WHITE}
        />
      ))}
      <path
        d="M208 256 h7 v11 h-7 z M215 259 l3 2 v6"
        fill="none"
        stroke={WHITE}
        strokeWidth={1.4}
      />

      <circle cx={CX} cy={CY} r={FACE_R} fill="url(#tick-glass)" />
      <text x={150} y={304} className={styles.badge}>
        {m.brand}
      </text>
    </svg>
  );
}

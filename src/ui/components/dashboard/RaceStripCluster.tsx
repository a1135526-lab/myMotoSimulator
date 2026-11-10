import styles from './dashboard.module.css';
import { alpha, gearText, NEUTRAL_GREEN, type LayoutProps } from './lcd';
import { Lamps, LcdClock } from './parts';

const LEDS = 16;
/** The strip starts lighting this far up to the redline. */
const STRIP_FROM = 0.55;
const GREEN = '#35e05a';
const YELLOW = '#ffd23f';
const RED = '#ff3b30';
const BLUE = '#3d8bff';
const LED_OFF = '#1a1d21';

/** LED colour by position: greens, then yellows, then reds. */
const ledColor = (i: number) => (i < 6 ? GREEN : i < 11 ? YELLOW : RED);

/**
 * Race dash (superbikes): a row of shift-light LEDs across the top that fills
 * with the revs and flashes blue at the shift point, a huge gear number in the
 * middle, speed on the left and revs on the right.
 */
export function RaceStripCluster({ m, r, lamps }: LayoutProps) {
  const from = m.redlineRpm * STRIP_FROM;
  const share = Math.max(0, Math.min(1, (r.rpm - from) / (m.redlineRpm - from)));
  const lit = Math.round(share * LEDS);
  const shift = lamps.shift || lamps.limiter;
  const neutral = r.gearLabel === 'N';
  const revShare = Math.min(1, r.rpm / m.tachMaxRpm);

  return (
    <svg viewBox="0 0 400 176" aria-hidden>
      <defs>
        <linearGradient id="race-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24272b" />
          <stop offset="1" stopColor="#08090a" />
        </linearGradient>
      </defs>
      <path
        d="M8 30 Q8 10 30 10 L370 10 Q392 10 392 30 L384 150 Q382 168 362 168 L38 168 Q18 168 16 150 Z"
        fill="url(#race-body)"
        stroke="#3a3f45"
      />
      {/* Shift lights */}
      {Array.from({ length: LEDS }, (_, i) => {
        const on = shift || i < lit;
        const color = shift ? BLUE : ledColor(i);
        return (
          <circle
            key={i}
            cx={42 + i * 21}
            cy={26}
            r={7}
            fill={on ? color : LED_OFF}
            className={shift ? styles.tftFlash : undefined}
            style={on ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
          />
        );
      })}
      <rect x={30} y={42} width={340} height={116} rx={8} fill="#030405" stroke="#1d2126" />

      {/* Speed */}
      <text x={98} y={92} className={styles.raceBig} fill="#fff">
        {Math.floor(r.speedKmh)}
      </text>
      <text x={98} y={124} className={styles.label} fill="#8d99a6" textAnchor="middle">
        km/h
      </text>

      {/* Gear */}
      <rect
        x={160}
        y={50}
        width={80}
        height={100}
        rx={8}
        fill={alpha(neutral ? NEUTRAL_GREEN : m.accent, 0.14)}
        stroke={neutral ? NEUTRAL_GREEN : m.accent}
        strokeWidth={3}
      />
      <text x={200} y={102} className={styles.raceGear} fill={neutral ? NEUTRAL_GREEN : '#fff'}>
        {gearText(r)}
      </text>

      {/* Revs: number and a bar */}
      <text x={302} y={80} className={styles.raceMid} fill={shift ? RED : '#fff'}>
        {Math.round(r.rpm / 100) * 100}
      </text>
      <text x={302} y={102} className={styles.label} fill="#8d99a6" textAnchor="middle">
        RPM
      </text>
      <rect x={256} y={110} width={92} height={8} rx={2} fill="#14181c" />
      <rect x={256} y={110} width={92 * revShare} height={8} rx={2} fill={shift ? RED : m.accent} />
      <Lamps x={256} y={130} width={92} state={lamps} />
      <LcdClock x={60} y={136} size={11} on="#cfd6dd" off="#ffffff08" />
      <text x={200} y={164} className={styles.label} fill="#6f7882" textAnchor="middle">
        {m.brand}
      </text>
    </svg>
  );
}

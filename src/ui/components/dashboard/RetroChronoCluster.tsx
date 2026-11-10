import { AnalogDial } from './AnalogDial';
import styles from './dashboard.module.css';
import { gearText, NEUTRAL_GREEN, type LayoutProps } from './lcd';
import { Lamps, LcdTrip, SevenSeg } from './parts';

const AMBER = '#ffb347';
const AMBER_OFF = '#ffb34712';

/**
 * Classic twin clocks (café racers, retro roadsters): cream-faced chrome
 * speedometer and tachometer, with a small amber window between them for the
 * gear and the trip.
 */
export function RetroChronoCluster({ m, r, lamps }: LayoutProps) {
  const speedStep = m.speedMaxKmh > 180 ? 40 : 20;
  const neutral = r.gearLabel === 'N';

  return (
    <svg viewBox="0 0 400 186" aria-hidden>
      <defs>
        <linearGradient id="retro-cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3632" />
          <stop offset="1" stopColor="#121110" />
        </linearGradient>
      </defs>
      <rect x={150} y={36} width={100} height={124} rx={14} fill="url(#retro-cup)" />
      <AnalogDial
        id="retro-speed"
        cx={86}
        cy={94}
        r={74}
        value={r.speedKmh}
        max={m.speedMaxKmh}
        majorStep={speedStep}
        divisor={1}
        redFrom={null}
        caption="km/h"
        needle="#c0392b"
        face="cream"
      />
      <AnalogDial
        id="retro-tach"
        cx={314}
        cy={94}
        r={74}
        value={r.rpm}
        max={m.tachMaxRpm}
        majorStep={1000}
        divisor={1000}
        redFrom={m.redlineRpm}
        caption="×1000 r/min"
        needle="#c0392b"
        face="cream"
      />
      <Lamps x={160} y={46} width={80} state={lamps} />
      <rect x={164} y={62} width={72} height={84} rx={5} fill="#0b0906" stroke="#5a4d3a" />
      <text x={200} y={74} className={styles.label} fill={AMBER} textAnchor="middle">
        GEAR
      </text>
      <SevenSeg
        text={gearText(r)}
        digits={1}
        x={189}
        y={79}
        size={34}
        on={neutral ? NEUTRAL_GREEN : AMBER}
        off={AMBER_OFF}
      />
      <LcdTrip km={r.tripKm} x={172} y={124} size={12} on={AMBER} off={AMBER_OFF} />
      <text x={200} y={174} className={styles.label} fill="#8a8072" textAnchor="middle">
        {m.brand}
      </text>
    </svg>
  );
}

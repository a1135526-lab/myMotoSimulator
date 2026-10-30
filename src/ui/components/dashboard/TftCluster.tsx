import styles from './dashboard.module.css';
import { alpha, labelStepRpm, type LayoutProps } from './lcd';
import { arcPath, polar } from './geometry';
import { Lamps } from './parts';

const CX = 180;
const CY = 236;
const R = 186;
const FROM_DEG = 222;
const TO_DEG = 318;
const ARC_W = 18;
const FUEL_BARS = 8;

const fmtClock = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Full-colour TFT (Kawasaki Z900, Yamaha MT-09, KYMCO KRV): a tach arc sweeping
 * over the top, big speed in the middle, the gear in a coloured box.
 */
export function TftCluster({ m, r, lamps }: LayoutProps) {
  const deg = (rpm: number) =>
    FROM_DEG + (Math.min(rpm, m.tachMaxRpm) / m.tachMaxRpm) * (TO_DEG - FROM_DEG);
  const step = labelStepRpm(m.tachMaxRpm);
  const hot = lamps.shift || lamps.limiter;

  return (
    <svg viewBox="0 0 360 196" aria-hidden>
      <defs>
        <linearGradient id="tft-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d141c" />
          <stop offset="1" stopColor="#04070a" />
        </linearGradient>
        <linearGradient id="tft-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={m.accent} />
          <stop offset="0.7" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#ff3b30" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="348" height="184" rx="18" fill="#0a0b0d" stroke="#3b4047" />
      <rect x="16" y="16" width="328" height="164" rx="10" fill="url(#tft-screen)" />

      <path
        d={arcPath(CX, CY, R, FROM_DEG, TO_DEG)}
        stroke="#1b232d"
        strokeWidth={ARC_W}
        fill="none"
      />
      <path
        d={arcPath(CX, CY, R, deg(m.redlineRpm), TO_DEG)}
        stroke={alpha('#ff3b30', 0.28)}
        strokeWidth={ARC_W}
        fill="none"
      />
      {r.rpm > 0 && (
        <path
          d={arcPath(CX, CY, R, FROM_DEG, Math.max(FROM_DEG + 0.5, deg(r.rpm)))}
          stroke="url(#tft-arc)"
          strokeWidth={ARC_W}
          fill="none"
          className={lamps.limiter ? styles.tftFlash : undefined}
        />
      )}
      {Array.from({ length: Math.floor(m.tachMaxRpm / step) + 1 }, (_, i) => {
        const v = i * step;
        const p = polar(CX, CY, R - ARC_W - 4, deg(v));
        const t = polar(CX, CY, R - ARC_W / 2, deg(v));
        const u = polar(CX, CY, R + ARC_W / 2, deg(v));
        return (
          <g key={i}>
            <line x1={t.x} y1={t.y} x2={u.x} y2={u.y} stroke="#04070a" strokeWidth={1.5} />
            <text
              x={p.x}
              y={p.y + 4}
              className={styles.scaleNum}
              fill={v >= m.redlineRpm ? '#ff5b4e' : '#8d99a6'}
            >
              {v / 1000}
            </text>
          </g>
        );
      })}

      <Lamps x={30} y={30} width={90} state={lamps} />
      <text x={330} y={34} className={styles.tftText} textAnchor="end">
        {fmtClock()}
      </text>

      <text x={180} y={146} className={styles.tftSpeed} fill={hot ? '#ffd23f' : '#fff'}>
        {Math.floor(r.speedKmh)}
      </text>
      <text x={180} y={162} className={styles.label} fill="#8d99a6" textAnchor="middle">
        km/h
      </text>

      {m.manual && (
        <g>
          <rect
            x={276}
            y={134}
            width={50}
            height={40}
            rx={8}
            fill={alpha(m.accent, 0.12)}
            stroke={r.gearLabel === 'N' ? '#2bff6a' : m.accent}
            strokeWidth={2}
          />
          <text
            x={301}
            y={155}
            className={styles.tftGear}
            fill={r.gearLabel === 'N' ? '#2bff6a' : '#fff'}
          >
            {r.gearLabel}
          </text>
        </g>
      )}

      <text x={30} y={132} className={styles.label} fill="#8d99a6">
        TRIP
      </text>
      <text x={30} y={146} className={styles.tftText}>
        {(r.tripKm % 1000).toFixed(1)} km
      </text>
      <text x={92} y={132} className={styles.label} fill="#8d99a6">
        RPM
      </text>
      <text x={92} y={146} className={styles.tftText}>
        {Math.round(r.rpm / 10) * 10}
      </text>
      {Array.from({ length: FUEL_BARS }, (_, i) => (
        <rect
          key={i}
          x={60 + i * 10}
          y={162}
          width={7}
          height={6}
          rx={1}
          fill={i < 2 ? '#ffb020' : m.accent}
        />
      ))}
      <text x={30} y={168} className={styles.label} fill="#8d99a6">
        FUEL
      </text>
    </svg>
  );
}

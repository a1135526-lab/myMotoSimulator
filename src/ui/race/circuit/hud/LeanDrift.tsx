import styles from './hud.module.css';

const MAX_LEAN_SHOWN_DEG = 60;
const DRIFT_SHOWN_PCT = 15;

/** Lean angle on a half-dial with a tilting bike, and the brake-slide meter. */
export function LeanDrift({ leanDeg, driftPct }: { leanDeg: number; driftPct: number }) {
  const clamped = Math.max(-MAX_LEAN_SHOWN_DEG, Math.min(MAX_LEAN_SHOWN_DEG, leanDeg));
  const side = leanDeg > 1 ? 'L' : leanDeg < -1 ? 'R' : '';
  const sliding = driftPct > DRIFT_SHOWN_PCT;
  return (
    <div className={styles.leanPanel}>
      <div className={styles.lean} aria-label={`壓車角 ${Math.abs(leanDeg).toFixed(0)} 度`}>
        <svg viewBox="-60 -58 120 66" aria-hidden>
          <path d="M -50 0 A 50 50 0 0 1 50 0" className={styles.leanArc} />
          {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map((d) => (
            <line
              key={d}
              x1="0"
              y1="-50"
              x2="0"
              y2={Math.abs(d) % 30 === 0 ? -42 : -46}
              transform={`rotate(${d})`}
              className={styles.leanTick}
            />
          ))}
          {/* Bike seen from behind: tyre, body and rider, tilted by the lean. */}
          <g transform={`rotate(${-clamped})`} className={styles.leanBike}>
            <rect x="-3" y="-30" width="6" height="30" rx="3" />
            <rect x="-7" y="-26" width="14" height="10" rx="3" />
            <circle cx="0" cy="-35" r="5" />
          </g>
        </svg>
        <span className={styles.leanValue}>
          {side && <small>{side}</small>}
          {Math.abs(leanDeg).toFixed(0)}°
        </span>
      </div>
      <div className={sliding ? styles.driftOn : styles.drift} data-testid="drift-meter">
        <span>DRIFT</span>
        <span className={styles.driftBar}>
          <span style={{ width: `${driftPct}%` }} />
        </span>
      </div>
    </div>
  );
}

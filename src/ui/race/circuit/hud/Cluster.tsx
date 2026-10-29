import styles from './hud.module.css';

/** Dial sweep: 270° open at the bottom, in SVG degrees (clockwise from +x). */
const START_DEG = 135;
const SWEEP_DEG = 270;
const R = 82;
const C = 100;
const SHIFT_LEDS = 8;
/** Shift lights start at this share of the redline and are all lit just below it. */
const LEDS_FROM = 0.72;
const LEDS_FULL = 0.97;
const MAX_LABELS = 16;
const RPM_PER_LABEL = 1000;

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
};

function arc(fromFrac: number, toFrac: number, r: number): string {
  const a = START_DEG + fromFrac * SWEEP_DEG;
  const b = START_DEG + toFrac * SWEEP_DEG;
  const p = polar(a, r);
  const q = polar(b, r);
  const large = b - a > 180 ? 1 : 0;
  return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
}

function ShiftLights({ share, limiter }: { share: number; limiter: boolean }) {
  const lit = Math.round(
    Math.min(1, Math.max(0, (share - LEDS_FROM) / (LEDS_FULL - LEDS_FROM))) * SHIFT_LEDS,
  );
  const flash = limiter || share >= LEDS_FULL;
  return (
    <div className={flash ? styles.ledsFlash : styles.leds} aria-hidden>
      {Array.from({ length: SHIFT_LEDS }, (_, i) => (
        <span
          key={i}
          className={styles.led}
          data-on={i < lit || flash}
          data-zone={i < 3 ? 'g' : i < 6 ? 'y' : 'r'}
        />
      ))}
    </div>
  );
}

interface ClusterProps {
  readonly speedKmh: number;
  readonly rpm: number;
  readonly redlineRpm: number;
  readonly revLimiter: boolean;
  readonly gearLabel: string | null;
  readonly throttle: number;
  readonly brake: number;
}

/** Tachometer dial with shift lights, digital speed and gear, plus pedal bars. */
export function Cluster({
  speedKmh,
  rpm,
  redlineRpm,
  revLimiter,
  gearLabel,
  throttle,
  brake,
}: ClusterProps) {
  const maxRpm = Math.ceil((redlineRpm * 1.1) / RPM_PER_LABEL) * RPM_PER_LABEL;
  const frac = Math.min(1, Math.max(0, rpm / maxRpm));
  const redFrac = redlineRpm / maxRpm;
  const labels = maxRpm / RPM_PER_LABEL;
  const every = labels > MAX_LABELS ? 2 : 1;

  return (
    <div className={styles.cluster}>
      <div className={styles.pedals} aria-hidden>
        <span className={styles.pedalBrake} style={{ height: `${brake * 100}%` }} />
        <span className={styles.pedalThrottle} style={{ height: `${throttle * 100}%` }} />
      </div>
      <div className={styles.dial}>
        <ShiftLights share={rpm / redlineRpm} limiter={revLimiter} />
        <svg viewBox="0 0 200 178" aria-hidden>
          <path d={arc(0, 1, R)} className={styles.dialTrack} />
          <path d={arc(redFrac, 1, R + 7)} className={styles.dialRed} />
          {Array.from({ length: labels + 1 }, (_, i) => {
            const f = i / labels;
            const deg = START_DEG + f * SWEEP_DEG;
            const a = polar(deg, R - 12);
            const b = polar(deg, R - 4);
            const t = polar(deg, R - 24);
            return (
              <g key={i}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.tick} />
                {i % every === 0 && (
                  <text x={t.x} y={t.y} className={f >= redFrac ? styles.tickRed : styles.tickText}>
                    {i}
                  </text>
                )}
              </g>
            );
          })}
          <path
            d={arc(0, 1, R)}
            pathLength={100}
            strokeDasharray={`${(frac * 100).toFixed(2)} 100`}
            className={frac >= redFrac ? styles.dialFillRed : styles.dialFill}
          />
        </svg>
        <span
          className={styles.gearBox}
          data-testid={gearLabel === null ? undefined : 'circuit-gear'}
        >
          {gearLabel ?? 'D'}
        </span>
        <div className={styles.readout}>
          <small className={styles.rpmLabel}>×1000 RPM</small>
          <strong className={styles.speedValue} data-testid="circuit-speed">
            {Math.floor(speedKmh)}
          </strong>
          <small className={styles.speedUnit}>KM/H</small>
        </div>
      </div>
    </div>
  );
}

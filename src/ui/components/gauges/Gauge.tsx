import { useMemo, type ReactNode } from 'react';
import styles from './Gauge.module.css';
import { useSmoothedValue } from './useSmoothedValue';

export interface GaugeProps {
  value: number;
  max: number;
  majorStep: number;
  minorStep: number;
  /** Values from here to max are drawn red. */
  redlineFrom?: number;
  label: string;
  unit: string;
  /** Digital readout under the needle. */
  readout: string;
  /** Tick labels are value ÷ labelDivisor (e.g. 1000 for "×1000 rpm"). */
  labelDivisor?: number;
  /** Extra line under the readout (e.g. a status chip). */
  footer?: ReactNode;
  /** Shown above the hub, e.g. the gear indicator. */
  center?: ReactNode;
  testId?: string;
}

const START_DEG = 135;
const SWEEP_DEG = 270;
const SIZE = 240;
const C = SIZE / 2;
const R = 100;

const polar = (deg: number, radius: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: C + radius * Math.cos(rad), y: C + radius * Math.sin(rad) };
};

const angleOf = (v: number, max: number) =>
  START_DEG + (Math.min(Math.max(v, 0), max) / max) * SWEEP_DEG;

function arcPath(from: number, to: number, radius: number): string {
  const a = polar(from, radius);
  const b = polar(to, radius);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** Analogue dial: 270° sweep, major/minor ticks, red zone, smoothed needle. */
export function Gauge(props: GaugeProps) {
  const { value, max, majorStep, minorStep, redlineFrom, label, unit, readout, footer } = props;
  const divisor = props.labelDivisor ?? 1;
  const smoothed = useSmoothedValue(value);

  const ticks = useMemo(() => {
    const out: { v: number; major: boolean }[] = [];
    for (let v = 0; v <= max + 1e-9; v += minorStep) {
      out.push({ v, major: Math.abs(v / majorStep - Math.round(v / majorStep)) < 1e-6 });
    }
    return out;
  }, [max, majorStep, minorStep]);

  const needle = polar(angleOf(smoothed, max), R - 18);
  const inRed = redlineFrom !== undefined && value >= redlineFrom;

  return (
    <figure className={styles.gauge} data-testid={props.testId} data-value={Math.round(value)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${label} ${readout} ${unit}`}>
        <path d={arcPath(START_DEG, START_DEG + SWEEP_DEG, R)} className={styles.track} />
        {redlineFrom !== undefined && redlineFrom < max && (
          <path
            d={arcPath(angleOf(redlineFrom, max), START_DEG + SWEEP_DEG, R)}
            className={styles.redzone}
          />
        )}
        <path
          d={arcPath(START_DEG, angleOf(smoothed, max), R)}
          className={inRed ? styles.progressRed : styles.progress}
        />
        {ticks.map(({ v, major }) => {
          const deg = angleOf(v, max);
          const outer = polar(deg, R - 8);
          const inner = polar(deg, R - (major ? 20 : 14));
          const text = polar(deg, R - 34);
          return (
            <g key={v}>
              <line
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                className={major ? styles.major : styles.minor}
              />
              {major && (
                <text
                  x={text.x}
                  y={text.y}
                  className={styles.tickLabel}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {Math.round(v / divisor)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={C} y1={C} x2={needle.x} y2={needle.y} className={styles.needle} />
        <circle cx={C} cy={C} r={7} className={styles.hub} />
      </svg>
      {props.center && <div className={styles.center}>{props.center}</div>}
      <figcaption className={styles.caption}>
        <span
          className={`${styles.readout} tabular`}
          data-testid={props.testId && `${props.testId}-readout`}
        >
          {readout}
        </span>
        <span className={styles.unit}>{unit}</span>
        <span className={styles.label}>{label}</span>
        {footer}
      </figcaption>
    </figure>
  );
}

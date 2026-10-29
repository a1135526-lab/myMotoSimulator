import { Gauge } from './Gauge';
import styles from './gauges.module.css';

interface TachometerProps {
  rpm: number;
  maxRpm: number;
  redlineRpm: number;
  revLimiter: boolean;
  /** "N", "1"… for manual bikes; null hides the indicator. */
  gearLabel: string | null;
  engineRunning: boolean;
}

export function Tachometer(props: TachometerProps) {
  const { rpm, maxRpm, redlineRpm, revLimiter, gearLabel, engineRunning } = props;
  const footer = !engineRunning ? (
    <span className={styles.stalled}>熄火</span>
  ) : revLimiter ? (
    <span className={styles.limiter}>斷油</span>
  ) : null;

  return (
    <Gauge
      testId="tachometer"
      value={rpm}
      max={maxRpm}
      majorStep={1000}
      minorStep={500}
      redlineFrom={redlineRpm}
      labelDivisor={1000}
      label="×1000 RPM"
      unit="rpm"
      readout={Math.round(rpm).toLocaleString('en-US')}
      footer={footer}
      center={
        gearLabel !== null && (
          <span
            className={gearLabel === 'N' ? styles.gearNeutral : styles.gear}
            data-testid="gear-indicator"
          >
            {gearLabel}
          </span>
        )
      }
    />
  );
}

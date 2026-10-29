import type { TelemetryView } from '@/application';
import { Panel } from '../common/Panel';
import styles from './telemetry.module.css';

const CLUTCH_CLASS: Record<TelemetryView['clutchState'], string | undefined> = {
  disengaged: styles.clutchOff,
  slipping: styles.clutchSlip,
  locked: styles.clutchLock,
};

type Tone = 'accent' | 'danger' | 'info';
const FILL_CLASS: Record<Tone, string | undefined> = {
  accent: styles.barFillAccent,
  danger: styles.barFillDanger,
  info: styles.barFillInfo,
};

function Bar({ label, pct, tone }: { label: string; pct: number; tone: Tone }) {
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div className={FILL_CLASS[tone]} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${styles.barValue} tabular`}>{Math.round(pct)}%</span>
    </div>
  );
}

export function LiveDataPanel({ data }: { data: TelemetryView }) {
  const manual = data.gearLabel !== null;
  const stats = [
    { label: '引擎馬力', value: data.enginePs.toFixed(1), unit: 'ps' },
    { label: '後輪馬力', value: data.wheelPs.toFixed(1), unit: 'ps' },
    manual
      ? { label: '檔位齒比', value: data.gearRatio ? data.gearRatio.toFixed(3) : '—', unit: '' }
      : { label: '變速比', value: data.gearRatio.toFixed(2), unit: '' },
    { label: '加速度', value: data.accelG.toFixed(2), unit: 'G' },
    { label: '距離', value: data.distanceM.toFixed(0), unit: 'm' },
  ];

  return (
    <Panel title="即時數據">
      <Bar label="油門" pct={data.throttlePct} tone="accent" />
      <Bar label="煞車" pct={data.brakePct} tone="danger" />
      {manual && <Bar label="離合" pct={data.clutchLeverPct} tone="info" />}
      <div className={styles.clutchRow}>
        <span className={styles.statLabel}>離合器</span>
        <span className={CLUTCH_CLASS[data.clutchState]} data-testid="clutch-state">
          {data.clutchLabel}
        </span>
      </div>
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt className={styles.statLabel}>{s.label}</dt>
            <dd className={`${styles.statValue} tabular`}>
              {s.value}
              <small>{s.unit}</small>
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

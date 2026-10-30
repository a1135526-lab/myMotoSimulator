import { useState } from 'react';
import {
  selectionForLevel,
  TUNE_LEVEL_LABELS,
  useConfigStore,
  useCurrentBike,
  useGarageEstimate,
  useRaceStore,
  type TuneLevel,
} from '@/application';
import { PartsPanel } from '../../components/config/PartsPanel';
import styles from './setup.module.css';

const LEVELS = Object.keys(TUNE_LEVEL_LABELS) as TuneLevel[];

interface DeltaProps {
  before: number | null;
  after: number | null;
  unit: string;
  lowerIsBetter?: boolean;
}

function Delta({ before, after, unit, lowerIsBetter }: DeltaProps) {
  if (before === null || after === null) return <span className="tabular">—</span>;
  const diff = after - before;
  const better = lowerIsBetter ? diff < -0.005 : diff > 0.005;
  const worse = lowerIsBetter ? diff > 0.005 : diff < -0.005;
  return (
    <span className="tabular">
      {after.toFixed(2)} {unit}
      {(better || worse) && (
        <small className={better ? styles.better : styles.worse}>
          {' '}
          ({diff > 0 ? '+' : ''}
          {diff.toFixed(2)})
        </small>
      )}
    </span>
  );
}

/** Manual bikes: who works the clutch lever. */
function ClutchMode() {
  const autoClutch = useRaceStore((s) => s.autoClutch);
  const setAutoClutch = useRaceStore((s) => s.setAutoClutch);
  const modes = [
    {
      auto: true,
      label: '自動半離合',
      note: '只管換檔：起步自動半離合、停車不熄火；按住 ↓+↑ 原地拉轉速',
    },
    { auto: false, label: '全手動離合', note: 'Shift 拉離合、自己控制半離合，放太快會熄火' },
  ];
  return (
    <div>
      <h3 className={styles.sectionTitle}>離合器</h3>
      <div className={styles.presetRow} role="radiogroup" aria-label="離合器模式">
        {modes.map((m) => (
          <button
            key={m.label}
            type="button"
            role="radio"
            aria-checked={autoClutch === m.auto}
            className={autoClutch === m.auto ? styles.presetActive : styles.presetCard}
            onClick={() => setAutoClutch(m.auto)}
            data-testid={m.auto ? 'clutch-auto' : 'clutch-manual'}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className={styles.hint}>{modes.find((m) => m.auto === autoClutch)?.note}</p>
    </div>
  );
}

export function StepTune() {
  const bike = useCurrentBike();
  const rider = useConfigStore((s) => s.selection.riderMassKg);
  const setSelection = useConfigStore((s) => s.setSelection);
  const estimate = useGarageEstimate();
  const [detailed, setDetailed] = useState(false);
  const selection = useConfigStore((s) => s.selection);
  const activeLevel = LEVELS.find(
    (l) => JSON.stringify(selectionForLevel(bike, l, rider)) === JSON.stringify(selection),
  );

  return (
    <div className={styles.tuneLayout}>
      <div>
        <h3 className={styles.sectionTitle}>快速套用</h3>
        <div className={styles.presetRow}>
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={level === activeLevel ? styles.presetActive : styles.presetCard}
              aria-pressed={level === activeLevel}
              onClick={() => setSelection(selectionForLevel(bike, level, rider))}
              data-testid={`tune-${level}`}
            >
              {TUNE_LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.link}
          onClick={() => setDetailed((d) => !d)}
          aria-expanded={detailed}
        >
          {detailed ? '收起詳細調校 ▲' : '展開詳細調校（普利珠、彈簧、ECU…）▼'}
        </button>
        {detailed && <PartsPanel />}
        {bike.kind === 'manual' && <ClutchMode />}
      </div>

      <aside className={styles.estimate} aria-label="預估成績" data-testid="tune-estimate">
        <h3 className={styles.sectionTitle}>
          {bike.brand} {bike.model}
        </h3>
        <dl>
          <div>
            <dt>峰值馬力</dt>
            <dd>
              <Delta before={estimate.peakPs.stock} after={estimate.peakPs.current} unit="ps" />
            </dd>
          </div>
          <div>
            <dt>{estimate.label}</dt>
            <dd>
              <Delta
                before={estimate.stock.seconds}
                after={estimate.current.seconds}
                unit="s"
                lowerIsBetter
              />
            </dd>
          </div>
          <div>
            <dt>終點速度</dt>
            <dd>
              <Delta before={estimate.stock.trapKmh} after={estimate.current.trapKmh} unit="km/h" />
            </dd>
          </div>
        </dl>
        <p className={styles.hint}>括號內為和原廠的差距。預估由程式騎士跑出，不含反應時間。</p>
      </aside>
    </div>
  );
}

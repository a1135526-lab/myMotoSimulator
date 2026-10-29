import { useState } from 'react';
import {
  selectionForLevel,
  TUNE_LEVEL_LABELS,
  useConfigStore,
  useCurrentBike,
  useGarageEstimate,
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

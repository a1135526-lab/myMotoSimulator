import type { TimerView } from '@/application';
import { Panel } from '../common/Panel';
import styles from './telemetry.module.css';

interface TimerPanelProps {
  timer: TimerView;
  onToggle: () => void;
}

export function TimerPanel({ timer, onToggle }: TimerPanelProps) {
  const active = timer.phase === 'armed' || timer.phase === 'running';
  return (
    <Panel
      title="成績"
      actions={
        <button type="button" className={styles.timerButton} onClick={onToggle}>
          {active ? '停止' : '開始計時'}
          <kbd>Space</kbd>
        </button>
      }
    >
      <p className={styles.phase} data-phase={timer.phase} data-testid="timer-phase">
        {timer.phaseLabel}
        {timer.phase === 'running' && (
          <span className="tabular"> {timer.elapsedS.toFixed(1)} s</span>
        )}
      </p>
      <dl className={styles.splits} data-testid="timer-splits">
        {timer.splits.map((s) => (
          <div key={s.label} className={styles.split}>
            <dt>{s.label}</dt>
            <dd className="tabular">
              {s.seconds === undefined ? '—' : `${s.seconds.toFixed(2)} s`}
            </dd>
          </div>
        ))}
        <div className={styles.split}>
          <dt>極速</dt>
          <dd className="tabular">
            {timer.topSpeedKmh > 0 ? `${timer.topSpeedKmh.toFixed(1)} km/h` : '—'}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

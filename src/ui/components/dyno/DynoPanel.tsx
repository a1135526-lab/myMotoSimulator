import { useDynoCharts, useTelemetry, useUiStore, type DynoView } from '@/application';
import { Panel } from '../common/Panel';
import { ChassisChart } from './ChassisChart';
import { DynoSummaryTable } from './DynoSummaryTable';
import { EngineChart } from './EngineChart';
import styles from './dyno.module.css';

const TABS: { id: DynoView; label: string }[] = [
  { id: 'chassis', label: '後輪馬力 vs 車速' },
  { id: 'engine', label: '引擎馬力 / 扭力 vs 轉速' },
];

export function DynoPanel() {
  const { engineRows, chassisRows, summaries, series } = useDynoCharts();
  const view = useUiStore((s) => s.dynoView);
  const setView = useUiStore((s) => s.setDynoView);
  const liveSpeed = useTelemetry()?.speedKmh;

  return (
    <Panel
      title="馬力機"
      actions={
        <div role="tablist" className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={view === t.id}
              className={view === t.id ? styles.tabActive : styles.tab}
              onClick={() => setView(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
    >
      <p className={styles.note}>
        全油門自動跑一次，改裝即時重算。實線為馬力，虛線為{view === 'engine' ? '扭力' : '引擎轉速'}
        。
      </p>
      {view === 'engine' ? (
        <EngineChart rows={engineRows} series={series} />
      ) : (
        <ChassisChart rows={chassisRows} series={series} liveSpeedKmh={liveSpeed} />
      )}
      <DynoSummaryTable summaries={summaries} />
    </Panel>
  );
}

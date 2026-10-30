import {
  TIME_OF_DAY_LABELS,
  TRAFFIC_LABELS,
  useConfigStore,
  useCurrentBike,
  useStreetStore,
  type TimeOfDay,
  type TrafficLevel,
} from '@/application';
import { ModeTabs } from '../components/common/ModeTabs';
import { SoundToggle } from '../components/common/SoundToggle';
import { AppLayout } from '../layouts/AppLayout';
import { BikeGrid } from '../race/setup/BikeGrid';
import setup from '../race/setup/setup.module.css';
import styles from './street.module.css';

const TIMES = Object.keys(TIME_OF_DAY_LABELS) as TimeOfDay[];
const TRAFFIC = Object.keys(TRAFFIC_LABELS) as TrafficLevel[];

/** Before riding: bike, time of day, traffic and aids. */
export function StreetSetup() {
  const bike = useCurrentBike();
  const selectBike = useConfigStore((s) => s.selectBike);
  const s = useStreetStore();
  const manual = bike.kind === 'manual';

  return (
    <AppLayout
      toolbar={
        <>
          <ModeTabs />
          <SoundToggle />
        </>
      }
    >
      <section className={setup.panel}>
        <header className={setup.panelHeader}>
          <h2>街景模式・港灣市</h2>
          <p className={setup.summary}>
            在城市裡自由騎乘：市中心、商業區、住宅區、港區和濱海快速道路。改裝沿用車庫設定。
          </p>
        </header>
        <div className={styles.setup}>
          <BikeGrid selectedId={bike.id} onSelect={selectBike} testIdPrefix="street-bike" />
          <div className={styles.optionRow}>
            <span className={styles.optionLabel}>時段</span>
            <div className={setup.filters} role="radiogroup" aria-label="時段">
              {TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={s.timeOfDay === t}
                  className={s.timeOfDay === t ? setup.chipActive : setup.chip}
                  onClick={() => s.setTimeOfDay(t)}
                  data-testid={`time-${t}`}
                >
                  {TIME_OF_DAY_LABELS[t]}
                </button>
              ))}
            </div>
            <span className={styles.optionLabel}>車流</span>
            <div className={setup.filters} role="radiogroup" aria-label="車流">
              {TRAFFIC.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={s.traffic === t}
                  className={s.traffic === t ? setup.chipActive : setup.chip}
                  onClick={() => s.setTraffic(t)}
                  data-testid={`traffic-${t}`}
                >
                  {TRAFFIC_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          {manual && (
            <div className={styles.optionRow}>
              <label className={setup.option}>
                <input
                  type="checkbox"
                  checked={s.autoShift}
                  onChange={(e) => s.setAutoShift(e.target.checked)}
                />
                自動換檔（含自動離合）
              </label>
              <label className={setup.option}>
                <input
                  type="checkbox"
                  checked={s.autoClutch}
                  disabled={s.autoShift}
                  onChange={(e) => s.setAutoClutch(e.target.checked)}
                />
                自動半離合（自己換檔）
              </label>
            </div>
          )}
        </div>
      </section>
      <footer className={setup.footer}>
        <span>
          {bike.brand} {bike.model}
        </span>
        <button
          type="button"
          className={setup.go}
          onClick={() => s.setStage('ride')}
          data-testid="street-go"
        >
          出發 🏙️
        </button>
      </footer>
    </AppLayout>
  );
}

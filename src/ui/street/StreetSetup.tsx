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
export function StreetSetup({ ready }: { ready: boolean }) {
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
          <h2>街景模式・高雄市楠梓區</h2>
          <p className={setup.summary}>
            依 OpenStreetMap
            真實路網重建的楠梓：從楠梓火車站出發，德民路、高楠公路、右昌、後勁、楠梓科技園區都騎得到。按
            M 打開大地圖搜尋地點並導航。改裝沿用車庫設定。
          </p>
          <p className={styles.attribution}>地圖資料 © OpenStreetMap 貢獻者（ODbL）</p>
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
          {ready ? '出發 🏙️' : '出發（地圖載入中…）'}
        </button>
      </footer>
    </AppLayout>
  );
}

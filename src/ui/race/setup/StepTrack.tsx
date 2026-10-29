import { useActiveTrack, useRaceStore, useTracks } from '@/application';
import styles from './setup.module.css';

const SKY_CLASS: Record<string, string | undefined> = {
  day: styles.skyDay,
  sunset: styles.skySunset,
  night: styles.skyNight,
  overcast: styles.skyOvercast,
};

export function StepTrack() {
  const tracks = useTracks();
  const { track: active, distanceM } = useActiveTrack();
  const setTrack = useRaceStore((s) => s.setTrack);
  const setCustom = useRaceStore((s) => s.setCustomDistance);
  const treeMode = useRaceStore((s) => s.treeMode);
  const setTreeMode = useRaceStore((s) => s.setTreeMode);

  return (
    <>
      <div className={styles.grid}>
        {tracks.map((t) => {
          const env = t.environment;
          const selected = t.id === active.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.trackCard} ${SKY_CLASS[t.sky] ?? ''} ${selected ? styles.trackSelected : ''}`}
              aria-pressed={selected}
              onClick={() => setTrack(t.id)}
              data-testid={`track-${t.id}`}
            >
              <strong className={styles.trackName}>
                {t.rain ? '🌧 ' : ''}
                {t.name}
              </strong>
              <span className={styles.trackTagline}>{t.tagline}</span>
              <dl className={styles.trackStats}>
                <div>
                  <dt>距離</dt>
                  <dd>{t.distanceM === null ? '自訂' : `${t.distanceM} m`}</dd>
                </div>
                <div>
                  <dt>抓地力</dt>
                  <dd>{env.tractionG.toFixed(2)} G</dd>
                </div>
                <div>
                  <dt>坡度</dt>
                  <dd>{env.gradePercent > 0 ? `+${env.gradePercent}` : env.gradePercent}%</dd>
                </div>
                <div>
                  <dt>海拔</dt>
                  <dd>{t.altitudeM} m</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      <div className={styles.options}>
        {active.distanceM === null && (
          <label className={styles.option}>
            自訂距離
            <input
              type="number"
              min={50}
              max={3000}
              step={10}
              value={distanceM}
              onChange={(e) => setCustom(Number(e.target.value) || distanceM)}
              aria-label="自訂賽程（公尺）"
              data-testid="race-distance"
            />
            m
          </label>
        )}
        <label className={styles.option}>
          起跑燈
          <select value={treeMode} onChange={(e) => setTreeMode(e.target.value as typeof treeMode)}>
            <option value="sportsman">業餘（黃燈逐一亮，間隔 0.5 秒）</option>
            <option value="pro">職業（黃燈齊亮，0.4 秒後綠燈）</option>
          </select>
        </label>
      </div>
    </>
  );
}

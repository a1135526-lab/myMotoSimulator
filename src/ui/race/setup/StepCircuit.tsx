import {
  circuitGeometry,
  MAX_CIRCUIT_OPPONENTS,
  MAX_LAPS,
  useActiveCircuit,
  useCircuits,
  useRaceStore,
} from '@/application';
import { CircuitMap } from '../circuit/CircuitMap';
import styles from './setup.module.css';

const SKY_CLASS: Record<string, string | undefined> = {
  day: styles.skyDay,
  sunset: styles.skySunset,
  night: styles.skyNight,
  overcast: styles.skyOvercast,
};

export function StepCircuit() {
  const circuits = useCircuits();
  const active = useActiveCircuit();
  const laps = useRaceStore((s) => s.laps);
  const count = useRaceStore((s) => s.opponentCount);
  const assist = useRaceStore((s) => s.assist);
  const brakeAssist = useRaceStore((s) => s.brakeAssist);
  const setBrakeAssist = useRaceStore((s) => s.setBrakeAssist);
  const autoShift = useRaceStore((s) => s.autoShift);
  const { setCircuit, setLaps, setOpponentCount, setAssist, setAutoShift } =
    useRaceStore.getState();

  return (
    <>
      <div className={styles.grid}>
        {circuits.map((c) => {
          const geo = circuitGeometry(c);
          const selected = c.id === active.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`${styles.trackCard} ${SKY_CLASS[c.sky] ?? ''} ${selected ? styles.trackSelected : ''}`}
              aria-pressed={selected}
              onClick={() => setCircuit(c.id)}
              data-testid={`circuit-${c.id}`}
            >
              <strong className={styles.trackName}>{c.name}</strong>
              <span className={styles.trackTagline}>{c.tagline}</span>
              <CircuitMap samples={geo.samples} className={styles.cardMap} />
              <dl className={styles.trackStats}>
                <div>
                  <dt>全長</dt>
                  <dd>{(geo.length / 1000).toFixed(2)} km</dd>
                </div>
                <div>
                  <dt>最急彎</dt>
                  <dd>
                    R {Math.round(1 / Math.max(...geo.samples.map((p) => Math.abs(p.curvature))))} m
                  </dd>
                </div>
                <div>
                  <dt>抓地力</dt>
                  <dd>{c.gripG.toFixed(2)} G</dd>
                </div>
                <div>
                  <dt>路寬</dt>
                  <dd>{c.widthM} m</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      <div className={styles.options}>
        <div className={styles.option}>
          圈數
          <div className={styles.filters}>
            {Array.from({ length: MAX_LAPS }, (_, i) => i + 1)
              .filter((n) => n <= 5 || n === MAX_LAPS)
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  className={laps === n ? styles.chipActive : styles.chip}
                  onClick={() => setLaps(n)}
                  data-testid={`laps-${n}`}
                >
                  {n}
                </button>
              ))}
          </div>
        </div>
        <div className={styles.option}>
          對手人數
          <div className={styles.filters}>
            {Array.from({ length: MAX_CIRCUIT_OPPONENTS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={count === n ? styles.chipActive : styles.chip}
                onClick={() => setOpponentCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className={styles.option}>
          <input type="checkbox" checked={assist} onChange={(e) => setAssist(e.target.checked)} />
          轉向輔助（自動壓車跟彎，左右鍵微調走線）
        </label>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={brakeAssist}
            onChange={(e) => setBrakeAssist(e.target.checked)}
            data-testid="brake-assist"
          />
          煞車輔助（入彎太快時自動收油、煞車）
        </label>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={autoShift}
            onChange={(e) => setAutoShift(e.target.checked)}
          />
          自動換檔（打檔車）
        </label>
      </div>
    </>
  );
}

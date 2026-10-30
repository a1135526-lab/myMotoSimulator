import { useBikeCatalog, useConfigStore, useCurrentBike } from '@/application';
import styles from './config.module.css';

/** 速克達 / 打檔車 toggle, then a model picker grouped by displacement band. */
export function BikeSelector() {
  const catalog = useBikeCatalog();
  const bike = useCurrentBike();
  const selectBike = useConfigStore((s) => s.selectBike);
  const current = catalog.find((k) => k.kind === bike.kind) ?? catalog[0];

  return (
    <div className={styles.bikeSelector}>
      <div role="radiogroup" aria-label="車種" className={styles.kindToggle}>
        {catalog.map((k) => (
          <button
            key={k.kind}
            type="button"
            role="radio"
            aria-checked={k.kind === bike.kind}
            className={k.kind === bike.kind ? styles.kindActive : styles.kind}
            onClick={() => k.kind !== bike.kind && selectBike(k.firstBikeId)}
            data-testid={`kind-${k.kind}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <label className={styles.inline}>
        <span>車款</span>
        <select
          value={bike.id}
          onChange={(e) => selectBike(e.target.value)}
          data-testid="bike-select"
        >
          {current?.groups.map((g) => (
            <optgroup key={g.band} label={g.label}>
              {g.bikes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </div>
  );
}

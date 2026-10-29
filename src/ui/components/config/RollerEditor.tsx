import { ROLLER_LIMITS, useConfigStore, useCurrentBike } from '@/application';
import { ResetButton } from '../common/ResetButton';
import styles from './config.module.css';

const SET_OPTIONS = Array.from(
  { length: ROLLER_LIMITS.max - ROLLER_LIMITS.min + 1 },
  (_, i) => ROLLER_LIMITS.min + i,
);

/** Per-roller mass inputs plus a whole-set picker. Renders nothing on manual bikes. */
export function RollerEditor() {
  const bike = useCurrentBike();
  const rollers = useConfigStore((s) => s.selection.rollerMassesG);
  const setRoller = useConfigStore((s) => s.setRoller);
  const setAll = useConfigStore((s) => s.setAllRollers);
  const reset = useConfigStore((s) => s.reset);

  if (bike.kind !== 'scooter') return null;
  const stock = bike.cvt.rollers;
  const stockG = stock.massG;
  const isStock = rollers.every((m) => m === stockG);
  const uniform = rollers.every((m) => m === rollers[0]);
  const total = rollers.reduce((a, b) => a + b, 0);

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupLabel}>普利珠</span>
        <span className={styles.hint}>
          原廠 {stock.count}×{stockG} g・目前總重 {total.toFixed(1)} g
        </span>
        <ResetButton onClick={() => reset('rollers')} disabled={isStock} />
      </div>
      <label className={styles.inline}>
        <span>整組</span>
        <select
          value={uniform ? String(rollers[0]) : ''}
          onChange={(e) => setAll(Number(e.target.value))}
          data-testid="roller-set"
        >
          {!uniform && <option value="">（混搭）</option>}
          {SET_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g} g{g === stockG ? '（原廠）' : ''}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.rollers}>
        {rollers.map((mass, i) => (
          <label key={i} className={styles.roller}>
            <span>#{i + 1}</span>
            <input
              type="number"
              min={ROLLER_LIMITS.min}
              max={ROLLER_LIMITS.max}
              step={ROLLER_LIMITS.step}
              value={mass}
              aria-label={`普利珠 ${i + 1} 重量 (g)`}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= ROLLER_LIMITS.min && v <= ROLLER_LIMITS.max) {
                  setRoller(i, v);
                }
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

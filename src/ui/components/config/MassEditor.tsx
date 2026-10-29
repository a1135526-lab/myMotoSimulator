import { useConfigStore, useCurrentBike } from '@/application';
import { ResetButton } from '../common/ResetButton';
import styles from './config.module.css';

export function MassEditor() {
  const bike = useCurrentBike();
  const rider = useConfigStore((s) => s.selection.riderMassKg);
  const extra = useConfigStore((s) => s.selection.extraMassKg);
  const grade = useConfigStore((s) => s.gradePercent);
  const setRider = useConfigStore((s) => s.setRiderMass);
  const setExtra = useConfigStore((s) => s.setExtraMass);
  const setGrade = useConfigStore((s) => s.setGrade);
  const reset = useConfigStore((s) => s.reset);

  const isStock = rider === bike.chassis.defaultRiderMassKg && extra === 0;
  const total = bike.chassis.curbMassKg + rider + extra;

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupLabel}>車重</span>
        <span className={styles.hint}>總重 {total} kg</span>
        <ResetButton onClick={() => reset('mass')} disabled={isStock} />
      </div>
      <label className={styles.slider}>
        <span>騎士體重</span>
        <input
          type="range"
          min={40}
          max={130}
          value={rider}
          onChange={(e) => setRider(Number(e.target.value))}
        />
        <output className="tabular">{rider} kg</output>
      </label>
      <label className={styles.slider}>
        <span>車重增減</span>
        <input
          type="range"
          min={-15}
          max={60}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
        />
        <output className="tabular">
          {extra > 0 ? '+' : ''}
          {extra} kg
        </output>
      </label>
      <label className={styles.slider}>
        <span>道路坡度</span>
        <input
          type="range"
          min={-10}
          max={15}
          value={grade}
          onChange={(e) => setGrade(Number(e.target.value))}
        />
        <output className="tabular">{grade}%</output>
      </label>
    </div>
  );
}

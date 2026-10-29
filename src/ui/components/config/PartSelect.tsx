import { isStock, useConfigStore, type CategoryOptions } from '@/application';
import { ResetButton } from '../common/ResetButton';
import styles from './config.module.css';

export function PartSelect({ category, label, options }: CategoryOptions) {
  const selection = useConfigStore((s) => s.selection);
  const setPart = useConfigStore((s) => s.setPart);
  const reset = useConfigStore((s) => s.reset);

  const value = selection.parts[category];
  const current = options.find((o) => o.id === value);

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <label className={styles.groupLabel} htmlFor={`part-${category}`}>
          {label}
        </label>
        <ResetButton onClick={() => reset(category)} disabled={isStock(selection, category)} />
      </div>
      <select
        id={`part-${category}`}
        value={value}
        onChange={(e) => setPart(category, e.target.value)}
        data-testid={`part-${category}`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {current?.description && <p className={styles.hint}>{current.description}</p>}
    </div>
  );
}

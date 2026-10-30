import { useUiStore, type AppMode } from '@/application';
import styles from './common.module.css';

const MODES: { id: AppMode; label: string }[] = [
  { id: 'simulator', label: '模擬器' },
  { id: 'race', label: '賽道模式' },
  { id: 'street', label: '街景模式' },
];

export function ModeTabs() {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  return (
    <nav className={styles.modeTabs} aria-label="模式">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-current={mode === m.id ? 'page' : undefined}
          className={mode === m.id ? styles.modeActive : styles.mode}
          onClick={() => setMode(m.id)}
          data-testid={`mode-${m.id}`}
        >
          {m.label}
        </button>
      ))}
    </nav>
  );
}

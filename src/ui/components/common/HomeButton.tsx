import { useUiStore } from '@/application';
import styles from './common.module.css';

/** Every mode is picked in the lobby; this is the way back to it. */
export function HomeButton() {
  const setMode = useUiStore((s) => s.setMode);
  return (
    <button
      type="button"
      className={styles.homeButton}
      onClick={() => setMode('home')}
      data-testid="go-home"
    >
      ← 大廳
    </button>
  );
}

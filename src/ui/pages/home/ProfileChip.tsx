import { matchStats, useAuthStore, useMatchStore, useUiStore } from '@/application';
import styles from './home.module.css';

/** Top left of the lobby: who you are and how you're doing; opens your profile. */
export function ProfileChip() {
  const nickname = useAuthStore((s) => s.nickname);
  const matches = useMatchStore((s) => s.matches);
  const setMode = useUiStore((s) => s.setMode);
  const { all } = matchStats(matches);
  const name = nickname ?? '訪客';
  return (
    <button
      type="button"
      className={styles.chip}
      onClick={() => setMode('profile')}
      data-testid="open-profile"
    >
      <span className={styles.avatar} aria-hidden>
        {name.slice(0, 1)}
      </span>
      <span className={styles.chipText}>
        <strong>{name}</strong>
        <small>
          {all.played} 場 · 勝率 {Math.round(all.rate * 100)}%
        </small>
      </span>
      <span className={styles.chipArrow} aria-hidden>
        ›
      </span>
    </button>
  );
}

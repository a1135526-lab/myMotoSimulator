import { useEffect } from 'react';
import styles from './splash.module.css';

/** How long the splash holds before the results, ms. */
export const SPLASH_MS = 2600;

const ORDINALS = ['1ST', '2ND', '3RD'];

/** The moment you cross the line: VICTORY, or your place, big. Tap to skip. */
export function FinishSplash({
  position,
  field,
  dnf,
  onDone,
}: {
  position: number;
  field: number;
  dnf: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDone, SPLASH_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  const won = position === 1 && !dnf;
  const tone = dnf ? 'dnf' : won ? 'win' : position <= 3 ? 'podium' : 'finish';
  const title = dnf ? 'DNF' : won ? 'VICTORY' : position <= 3 ? 'PODIUM' : 'FINISH';
  return (
    <button
      type="button"
      className={styles.splash}
      data-tone={tone}
      onClick={onDone}
      aria-label="看結算"
      data-testid="finish-splash"
    >
      <span className={styles.flash} aria-hidden />
      <span className={styles.title}>{title}</span>
      <span className={styles.place}>
        {dnf ? '未完賽' : `${ORDINALS[position - 1] ?? `${position}TH`} · 第 ${position} 名`}
        <small> / {field}</small>
      </span>
    </button>
  );
}

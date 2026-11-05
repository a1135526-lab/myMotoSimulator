import type { CornerCall } from '@/application';
import styles from './hud.module.css';

const KIND_LABELS: Readonly<Record<CornerCall['kind'], string>> = {
  hairpin: '髮夾彎',
  tight: '急彎',
  medium: '中速彎',
  fast: '高速彎',
};

/** Distances are rounded to this, m (a steady readout, not a blur). */
const ROUND_M = 10;

/** The next corner, small at the top: which way, how tight, how far. */
export function CornerCallout({ corner }: { corner: CornerCall | null }) {
  if (!corner || corner.distanceM <= 0) return null;
  const left = corner.dir === 'left';
  const slow = corner.kind === 'hairpin' || corner.kind === 'tight';
  return (
    <div
      className={styles.corner}
      data-slow={slow || undefined}
      role="status"
      data-testid="corner-callout"
    >
      <span className={styles.cornerArrow} data-dir={corner.dir} aria-hidden>
        {corner.kind === 'hairpin' ? (left ? '↶' : '↷') : left ? '↰' : '↱'}
      </span>
      <span>
        {left ? '左' : '右'} {KIND_LABELS[corner.kind]}
        <small> {Math.round(corner.turnDeg)}°</small>
      </span>
      <strong>{Math.max(ROUND_M, Math.round(corner.distanceM / ROUND_M) * ROUND_M)} m</strong>
    </div>
  );
}

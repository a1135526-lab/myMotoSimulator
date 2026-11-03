import { tierOf } from '@/application';
import styles from './ranked.module.css';

/** A tier name in its colour, with points and the way to the next tier. */
export function TierBadge({ points, compact = false }: { points: number; compact?: boolean }) {
  const { tier, next, progress } = tierOf(points);
  return (
    <div className={styles.tier} data-compact={compact || undefined}>
      <strong style={{ color: tier.color }}>{tier.name}</strong>
      <span>{points} 分</span>
      {!compact && (
        <>
          <div className={styles.bar} aria-hidden>
            <div style={{ width: `${Math.round(progress * 100)}%`, background: tier.color }} />
          </div>
          <small>{next ? `再 ${next.min - points} 分升上${next.name}` : '最高段位'}</small>
        </>
      )}
    </div>
  );
}

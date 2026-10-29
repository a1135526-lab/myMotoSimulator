import type { CircuitRiderView } from '@/application';
import styles from './hud.module.css';

/** Below this a rider is treated as crawling, so gaps don't blow up. */
const MIN_GAP_SPEED_MPS = 12;
const KMH_PER_MPS = 3.6;

/** Gap to the leader in seconds, estimated from distance and own speed. */
function gapLabel(r: CircuitRiderView, leader: CircuitRiderView): string {
  if (r === leader) return 'LEADER';
  if (r.finishTimeS !== null && leader.finishTimeS !== null) {
    return `+${(r.finishTimeS - leader.finishTimeS).toFixed(3)}`;
  }
  const gapM = leader.progressM - r.progressM;
  const v = Math.max(MIN_GAP_SPEED_MPS, r.speedKmh / KMH_PER_MPS);
  return `+${(gapM / v).toFixed(1)}`;
}

/** Broadcast-style standings down the left edge. */
export function TimingTower({ riders }: { riders: readonly CircuitRiderView[] }) {
  const order = [...riders].sort((a, b) => a.position - b.position);
  const leader = order[0];
  if (!leader) return null;
  return (
    <ol className={styles.tower} aria-label="即時名次">
      {order.map((r) => (
        <li key={r.name} className={r.isPlayer ? styles.towerMe : styles.towerRow}>
          <span className={styles.towerPos}>{r.position}</span>
          <span className={styles.towerName}>{r.name}</span>
          <span className={styles.towerGap}>{r.crashed ? 'CRASH' : gapLabel(r, leader)}</span>
        </li>
      ))}
    </ol>
  );
}

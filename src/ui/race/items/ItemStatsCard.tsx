import { ITEM_INFO, mostPicked, useItemStore } from '@/application';
import styles from './items.module.css';

/** At the flag of an item race: how you used your items. */
export function ItemStatsCard() {
  const stats = useItemStore((s) => s.stats);
  const top = mostPicked(stats);
  return (
    <section className={styles.stats} data-testid="item-stats">
      <h3>🎁 道具統計</h3>
      <dl>
        <div>
          <dt>使用道具</dt>
          <dd>{stats.used} 次</dd>
        </div>
        <div>
          <dt>打中對手</dt>
          <dd>{stats.landed} 次</dd>
        </div>
        <div>
          <dt>被打中</dt>
          <dd>{stats.taken} 次</dd>
        </div>
        <div>
          <dt>最常抽到</dt>
          <dd>{top ? `${ITEM_INFO[top].icon} ${ITEM_INFO[top].name}` : '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

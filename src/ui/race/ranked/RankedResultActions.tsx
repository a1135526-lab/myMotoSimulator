import { tierOf, useAuthStore, useRankedStore, useUiStore } from '@/application';
import resultStyles from '../circuit/results.module.css';
import { TierBadge } from './TierBadge';
import styles from './ranked.module.css';

/** End of a ranked race: points won or lost, the new tier, and go again. */
export function RankedResultActions() {
  const result = useRankedStore((s) => s.result);
  const group = useRankedStore((s) => s.group);
  const queue = useRankedStore((s) => s.queue);
  const cancel = useRankedStore((s) => s.cancel);
  const nickname = useAuthStore((s) => s.nickname);
  const setMode = useUiStore((s) => s.setMode);

  let summary = <p className={styles.points}>計算積分中…</p>;
  if (result?.state === 'error') {
    summary = <p className={styles.points}>⚠ 積分沒有更新：{result.error}</p>;
  } else if (result?.state === 'done') {
    const up = tierOf(result.points).index > tierOf(result.before).index;
    const down = tierOf(result.points).index < tierOf(result.before).index;
    summary = (
      <div className={styles.points} data-testid="ranked-delta">
        <strong data-sign={result.delta >= 0 ? 'up' : 'down'}>
          {result.delta >= 0 ? '+' : ''}
          {result.delta} 分
        </strong>
        {result.vsAi && <small>（對電腦，積分減半）</small>}
        {up && <span className={styles.promo}>🎉 升段！</span>}
        {down && <span className={styles.demo}>降段了</span>}
        <TierBadge points={result.points} />
      </div>
    );
  }

  return (
    <>
      {summary}
      <div className={resultStyles.resultActions}>
        <button
          type="button"
          className={resultStyles.secondary}
          onClick={() => {
            cancel();
            setMode('home');
          }}
        >
          離開
        </button>
        <button
          type="button"
          className={resultStyles.primary}
          onClick={() => void queue(group, nickname ?? '玩家')}
          autoFocus
          data-testid="ranked-again"
        >
          再來一場
        </button>
      </div>
    </>
  );
}

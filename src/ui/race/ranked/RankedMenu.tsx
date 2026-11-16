import { useEffect, useState } from 'react';
import {
  ladderOf,
  RANKED_GROUP_LABELS,
  RANKED_LAPS,
  onlineEnabled,
  RANKED_DIFFICULTIES,
  rankedDelta,
  type RankedGroup,
  tierOf,
  TIERS,
  useAuthStore,
  useRankedPrefs,
  useRankedStore,
} from '@/application';
import { TierBadge } from './TierBadge';
import { RankedBoard } from './RankedBoard';
import { RankedControls } from './RankedControls';
import styles from './ranked.module.css';

const GROUPS: readonly { id: RankedGroup; bike: string; icon: string }[] = [
  { id: 'scooter', bike: 'SYM JET SL 125（原廠）', icon: '🛵' },
  { id: 'manual', bike: 'Kawasaki Ninja 400（原廠）', icon: '🏍' },
];

/** Pick a group and queue; your tier in each, and the rules. */
export function RankedMenu() {
  const status = useAuthStore((s) => s.status);
  const nickname = useAuthStore((s) => s.nickname);
  const signIn = useAuthStore((s) => s.signIn);
  const mine = useRankedStore((s) => s.mine);
  const error = useRankedStore((s) => s.error);
  const loadMine = useRankedStore((s) => s.loadMine);
  const queue = useRankedStore((s) => s.queue);
  const [board, setBoard] = useState<RankedGroup>('scooter');
  // Item ranked: item races, on their own ladders.
  const [items, setItems] = useState(false);
  const difficulty = useRankedPrefs((s) => s.difficulty);
  const setDifficulty = useRankedPrefs((s) => s.setDifficulty);
  const picked = RANKED_DIFFICULTIES.find((d) => d.id === difficulty);
  const ready = status === 'signedIn' && nickname !== null;

  useEffect(() => {
    if (ready) void loadMine();
  }, [ready, loadMine]);

  if (!onlineEnabled) {
    return (
      <section className={styles.panel} data-testid="ranked-menu">
        <h2>🏆 排位賽</h2>
        <p className={styles.error}>這個版本沒有連線功能，無法使用排位賽。</p>
      </section>
    );
  }

  if (!ready) {
    return (
      <section className={styles.panel} data-testid="ranked-menu">
        <h2>🏆 排位賽</h2>
        <p className={styles.note}>
          排位賽的段位和積分存在你的帳號裡，要先登入（Google 或遊戲帳號）並取一個暱稱。
        </p>
        {status === 'signedOut' && (
          <button type="button" className={styles.primary} onClick={() => void signIn()}>
            🔑 登入
          </button>
        )}
      </section>
    );
  }

  return (
    <section className={styles.panel} data-testid="ranked-menu">
      <h2>🏆 排位賽</h2>
      <p className={styles.note}>
        配對線上段位接近的玩家（最多 4 人），20
        秒內沒配到就改跟電腦比。電腦的難度在下面選，越難贏的分越多。
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.tabs}>
        {[false, true].map((on) => (
          <button
            key={String(on)}
            type="button"
            aria-pressed={items === on}
            onClick={() => setItems(on)}
            data-testid={on ? 'ranked-items' : 'ranked-plain'}
          >
            {on ? '🎁 道具排位' : '一般排位'}
          </button>
        ))}
      </div>
      <h3>電腦難度</h3>
      <div className={styles.tabs} role="group" aria-label="電腦難度">
        {RANKED_DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={difficulty === d.id}
            onClick={() => setDifficulty(d.id)}
            data-testid={`ranked-difficulty-${d.id}`}
          >
            {d.label} · 第 1 名 +{rankedDelta(1, 4, true, d.id)}
          </button>
        ))}
      </div>
      {picked && (
        <p className={styles.note}>
          {picked.label}：{picked.blurb}。對電腦拿第 1 名 +{rankedDelta(1, 4, true, picked.id)}、第
          2 名 +{rankedDelta(2, 4, true, picked.id)}，第 3、4 名{' '}
          {rankedDelta(3, 4, true, picked.id)}、{rankedDelta(4, 4, true, picked.id)}
          （扣分每種難度都一樣）。
        </p>
      )}
      <div className={styles.groups}>
        {GROUPS.map((g) => {
          const r = mine[ladderOf(g.id, items)];
          const points = r?.points ?? 0;
          return (
            <div key={g.id} className={styles.group}>
              <h3>
                {g.icon} {items ? '道具 · ' : ''}
                {RANKED_GROUP_LABELS[g.id]}
              </h3>
              <small className={styles.note}>大家都騎 {g.bike}</small>
              <TierBadge points={points} />
              <p className={styles.note}>
                {r?.games ?? 0} 場 · 勝 {r?.wins ?? 0} · 勝率{' '}
                {r?.games ? Math.round((r.wins / r.games) * 100) : 0}% · 最高{' '}
                {tierOf(r?.best ?? 0).tier.name}
              </p>
              <button
                type="button"
                className={styles.primary}
                onClick={() => void queue(g.id, nickname, items)}
                data-testid={`ranked-queue-${g.id}`}
              >
                開始配對
              </button>
            </div>
          );
        })}
      </div>

      <RankedControls />

      <details className={styles.rules}>
        <summary>規則</summary>
        <ul>
          <li>
            賽道繞圈 {RANKED_LAPS}{' '}
            圈，每場隨機換賽道；禁止轉向輔助和煞車輔助（可以用自動換檔、傾斜轉向）。
          </li>
          <li>第一名過線後其他人只剩 15 秒，沒過線算未完賽（最後一名）。</li>
          <li>4 人：第 1 名 +30、第 2 名 +12、第 3 名 −6、第 4 名 −18；2 人：贏 +24、輸 −18。</li>
          <li>
            和電腦比：加分依難度是跟真人比的
            25%（簡單）、50%（普通）、75%（困難）、100%（極限），扣分一律減半；積分不會低於 0。
          </li>
          <li>極限難度完全不放水：每台電腦都用到抓地力極限、反應最快，沒有比較慢的對手。</li>
          <li>
            道具排位：道具賽，賽道從道具專用賽道和幾條短賽道裡挑；段位和積分跟一般排位分開算。
          </li>
          <li>段位：{TIERS.map((t) => `${t.name} ${t.min}`).join(' → ')} 分。</li>
        </ul>
      </details>

      <h3>排位排行榜</h3>
      <div className={styles.tabs}>
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={board === g.id}
            onClick={() => setBoard(g.id)}
          >
            {RANKED_GROUP_LABELS[g.id]}
          </button>
        ))}
      </div>
      <RankedBoard group={ladderOf(board, items)} />
    </section>
  );
}

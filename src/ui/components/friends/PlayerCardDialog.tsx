import { useEffect, useState } from 'react';
import {
  fetchPlayerCard,
  RANKED_GROUP_LABELS,
  useFriendsStore,
  type PlayerCard,
  type RankedGroup,
} from '@/application';
import { TierBadge } from '../../race/ranked/TierBadge';
import { FriendProfileDialog } from './FriendProfileDialog';
import styles from './friends.module.css';

const GROUPS: readonly RankedGroup[] = ['scooter', 'manual'];

/** Someone you raced: their ranked tiers, and their full record if they're a friend. */
export function PlayerCardDialog({
  name,
  bike,
  accountName,
  onClose,
}: {
  name: string;
  bike: string;
  accountName?: string;
  onClose: () => void;
}) {
  const friends = useFriendsStore((s) => s.friends);
  const [card, setCard] = useState<PlayerCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const friend = accountName
    ? friends.find(
        (f) => f.state === 'friend' && f.nickname.toLowerCase() === accountName.toLowerCase(),
      )
    : undefined;

  useEffect(() => {
    if (!accountName) return;
    let live = true;
    void fetchPlayerCard(accountName).then((res) => {
      if (!live) return;
      if (res.ok) setCard(res.value);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [accountName]);

  if (full && friend) return <FriendProfileDialog friend={friend} onClose={() => setFull(false)} />;

  return (
    <div className={styles.backdrop} role="dialog" aria-label={`${name} 的資訊`}>
      <section className={styles.dialog} data-testid="player-card">
        <h2>👤 {accountName ?? name}</h2>
        <p className={styles.note}>這場騎 {bike}</p>
        {!accountName && <p className={styles.note}>對方沒有登入，沒有段位資料。</p>}
        {error && (
          <p className={styles.message} data-bad="">
            {error}
          </p>
        )}
        {accountName && !card && !error && <p className={styles.note}>讀取中…</p>}
        {card &&
          GROUPS.map((g) => {
            const r = card.ranked[g];
            return (
              <div key={g}>
                <h3>{RANKED_GROUP_LABELS[g]}</h3>
                {r && r.games > 0 ? (
                  <>
                    <TierBadge points={r.points} compact />
                    <p className={styles.note}>
                      {r.games} 場 · 勝 {r.wins} · 勝率 {Math.round((r.wins / r.games) * 100)}%
                    </p>
                  </>
                ) : (
                  <p className={styles.note}>還沒打過排位</p>
                )}
              </div>
            );
          })}
        {friend && (
          <button type="button" className={styles.primary} onClick={() => setFull(true)}>
            查看完整戰績
          </button>
        )}
        <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
          ✕
        </button>
      </section>
    </div>
  );
}

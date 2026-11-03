import { useEffect, useMemo, useState } from 'react';
import { matchStats, useFriendsStore, type Friend, type MatchRecord } from '@/application';
import { BikeTable, KindTable, RecentMatches } from '../../pages/profile/ProfileTables';
import styles from './friends.module.css';

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

/** A friend's race record, from their account. */
export function FriendProfileDialog({ friend, onClose }: { friend: Friend; onClose: () => void }) {
  const friendMatches = useFriendsStore((s) => s.friendMatches);
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stats = useMemo(() => (matches ? matchStats(matches) : null), [matches]);

  useEffect(() => {
    let live = true;
    void friendMatches(friend.id).then((res) => {
      if (!live) return;
      if (res.ok) setMatches(res.value);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [friend.id, friendMatches]);

  return (
    <div className={styles.backdrop} role="dialog" aria-label={`${friend.nickname} 的資訊`}>
      <section className={styles.dialog} data-testid="friend-profile">
        <h2>👤 {friend.nickname}</h2>
        {error && (
          <p className={styles.message} data-bad="">
            {error}
          </p>
        )}
        {!matches && !error && <p className={styles.note}>讀取中…</p>}
        {stats && matches && (
          <>
            <p className={styles.note}>
              {stats.all.played} 場 · 勝 {stats.all.won} · 勝率{' '}
              {stats.all.played ? pct(stats.all.rate) : '—'} · 前三名 {stats.podiums} · 最長連勝{' '}
              {stats.bestStreak}
            </p>
            <h3>各模式戰績</h3>
            <KindTable stats={stats} />
            <h3>常用車款</h3>
            <BikeTable stats={stats} />
            <h3>最近的對戰</h3>
            <RecentMatches matches={matches.slice(0, 10)} />
          </>
        )}
        <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
          ✕
        </button>
      </section>
    </div>
  );
}

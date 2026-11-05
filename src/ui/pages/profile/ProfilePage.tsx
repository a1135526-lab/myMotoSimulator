import { useEffect, useMemo } from 'react';
import {
  matchStats,
  onlineEnabled,
  useAuthStore,
  useMatchStore,
  useUiStore,
  type SyncState,
} from '@/application';
import { HomeButton } from '../../components/common/HomeButton';
import { MusicToggle } from '../../components/common/MusicToggle';
import { LobbyMusicPlayer } from '../../audio/LobbyMusicPlayer';
import { ArtBackdrop } from '../../components/common/ArtBackdrop';
import { AppLayout } from '../../layouts/AppLayout';
import { BikeTable, KindTable, RecentMatches, RivalTable, TrackTable } from './ProfileTables';
import styles from './profile.module.css';

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

const hours = (s: number) => {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} 分鐘` : `${Math.floor(m / 60)} 小時 ${m % 60} 分`;
};

function syncText(sync: SyncState, signedIn: boolean): string {
  if (!onlineEnabled) return '對戰紀錄存在這台裝置上';
  if (!signedIn) return '對戰紀錄存在這台裝置上。登入後會同步到你的帳號，換裝置也看得到。';
  switch (sync.state) {
    case 'off':
      return '已登入，對戰紀錄會同步到你的帳號';
    case 'syncing':
      return '同步中…';
    case 'done':
      return '✓ 已和你的帳號同步';
    case 'error':
      return `⚠ 雲端同步失敗：${sync.error}（紀錄仍保存在這台裝置上）`;
  }
}

/** Your race record: totals, by mode, bikes, tracks, friends, and recent races. */
export function ProfilePage() {
  const matches = useMatchStore((s) => s.matches);
  const sync = useMatchStore((s) => s.sync);
  const syncNow = useMatchStore((s) => s.syncNow);
  const nickname = useAuthStore((s) => s.nickname);
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const signIn = useAuthStore((s) => s.signIn);
  const setMode = useUiStore((s) => s.setMode);
  const stats = useMemo(() => matchStats(matches), [matches]);
  const name = nickname ?? '訪客';

  useEffect(() => {
    if (signedIn) void syncNow();
  }, [signedIn, syncNow]);

  const cards: [string, string][] = [
    ['總場次', String(stats.all.played)],
    ['勝場', String(stats.all.won)],
    ['勝率', stats.all.played ? pct(stats.all.rate) : '—'],
    ['前三名', String(stats.podiums)],
    ['完賽率', stats.all.played ? pct(stats.finishRate) : '—'],
    ['未完賽／搶跑', String(stats.dnfs)],
    ['平均名次', stats.avgPosition === null ? '—' : stats.avgPosition.toFixed(1)],
    ['目前連勝', String(stats.currentStreak)],
    ['最長連勝', String(stats.bestStreak)],
    ['累計比賽時間', hours(stats.raceTimeS)],
  ];

  return (
    <AppLayout
      toolbar={
        <>
          <HomeButton />
          <MusicToggle />
        </>
      }
    >
      <LobbyMusicPlayer />
      <ArtBackdrop name="lobby" />
      <section className={styles.header} data-testid="profile">
        <span className={styles.avatar} aria-hidden>
          {name.slice(0, 1)}
        </span>
        <div className={styles.who}>
          <h2>{name}</h2>
          <p>{syncText(sync, signedIn)}</p>
        </div>
        <div className={styles.headerActions}>
          {onlineEnabled && !signedIn && (
            <button type="button" className={styles.primary} onClick={() => void signIn()}>
              🔑 登入
            </button>
          )}
          {signedIn && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => void syncNow()}
              disabled={sync.state === 'syncing'}
            >
              ⟳ 立即同步
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={() => setMode('home')}>
            ← 回大廳
          </button>
        </div>
      </section>

      <section className={styles.cards} aria-label="總覽">
        {cards.map(([label, value]) => (
          <div key={label} className={styles.card}>
            <span>{label}</span>
            <strong data-testid={`stat-${label}`}>{value}</strong>
          </div>
        ))}
      </section>

      <div className={styles.columns}>
        <section className={styles.section}>
          <h3>各模式戰績</h3>
          <KindTable stats={stats} />
        </section>
        <section className={styles.section}>
          <h3>常用車款</h3>
          <BikeTable stats={stats} />
        </section>
        <section className={styles.section}>
          <h3>賽道紀錄</h3>
          <TrackTable stats={stats} />
        </section>
        <section className={styles.section}>
          <h3>好友交手</h3>
          <RivalTable stats={stats} />
        </section>
      </div>

      <section className={styles.section}>
        <h3>最近的對戰（最多 30 場）</h3>
        <RecentMatches matches={matches} />
      </section>
    </AppLayout>
  );
}

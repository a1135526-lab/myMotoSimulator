import {
  MATCH_KIND_LABELS,
  type MatchKind,
  type MatchRecord,
  type MatchStats,
} from '@/application';
import { fmtLap } from '../../race/circuit/format';
import styles from './profile.module.css';

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

/** Race time: m:ss.000 on circuits, seconds on a drag strip. */
const fmtRaceTime = (kind: MatchKind, s: number | null) =>
  s === null ? '—' : kind === 'drag' ? `${s.toFixed(3)} s` : fmtLap(s);

const dateTime = (ms: number) => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
};

export function KindTable({ stats }: { stats: MatchStats }) {
  const kinds: MatchKind[] = ['room', 'circuit', 'drag'];
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>模式</th>
          <th>場次</th>
          <th>勝場</th>
          <th>勝率</th>
        </tr>
      </thead>
      <tbody>
        {kinds.map((k) => {
          const t = stats.byKind[k];
          return (
            <tr key={k}>
              <td>{MATCH_KIND_LABELS[k]}</td>
              <td className={styles.num}>{t.played}</td>
              <td className={styles.num}>{t.won}</td>
              <td className={styles.num}>{t.played ? pct(t.rate) : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function BikeTable({ stats }: { stats: MatchStats }) {
  if (stats.bikes.length === 0) return <p className={styles.empty}>還沒有紀錄</p>;
  return (
    <table className={styles.table} data-testid="profile-bikes">
      <thead>
        <tr>
          <th>車款</th>
          <th>場次</th>
          <th>勝場</th>
          <th>勝率</th>
        </tr>
      </thead>
      <tbody>
        {stats.bikes.slice(0, 10).map((b) => (
          <tr key={b.bike}>
            <td>{b.bike}</td>
            <td className={styles.num}>{b.played}</td>
            <td className={styles.num}>{b.won}</td>
            <td className={styles.num}>{pct(b.rate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TrackTable({ stats }: { stats: MatchStats }) {
  if (stats.tracks.length === 0) return <p className={styles.empty}>還沒有紀錄</p>;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>賽道</th>
          <th>模式</th>
          <th>場次</th>
          <th>勝場</th>
          <th>最佳</th>
        </tr>
      </thead>
      <tbody>
        {stats.tracks.map((t) => (
          <tr key={`${t.kind}:${t.trackId}`}>
            <td>{t.trackName}</td>
            <td className={styles.muted}>{MATCH_KIND_LABELS[t.kind]}</td>
            <td className={styles.num}>{t.played}</td>
            <td className={styles.num}>{t.won}</td>
            <td className={styles.num}>{fmtRaceTime(t.kind, t.bestTimeS)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RivalTable({ stats }: { stats: MatchStats }) {
  if (stats.rivals.length === 0) {
    return <p className={styles.empty}>還沒有和朋友對戰過，到「好友對戰」開一個房間吧</p>;
  }
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>對手</th>
          <th>同場</th>
          <th>贏</th>
          <th>輸</th>
        </tr>
      </thead>
      <tbody>
        {stats.rivals.slice(0, 10).map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td className={styles.num}>{r.races}</td>
            <td className={styles.num}>{r.wins}</td>
            <td className={styles.num}>{r.losses}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function resultLabel(m: MatchRecord): string {
  if (m.dnf) return m.kind === 'drag' ? '搶跑' : '未完賽';
  return m.won ? '🏆 第 1 名' : `第 ${m.position} 名`;
}

export function RecentMatches({ matches }: { matches: readonly MatchRecord[] }) {
  if (matches.length === 0) {
    return <p className={styles.empty}>還沒有對戰紀錄。跑完一場比賽就會出現在這裡。</p>;
  }
  return (
    <ol className={styles.matches} data-testid="profile-matches">
      {matches.slice(0, 30).map((m) => (
        <li key={m.id} data-result={m.dnf ? 'dnf' : m.won ? 'win' : 'loss'}>
          <div className={styles.matchHead}>
            <strong>{resultLabel(m)}</strong>
            <span className={styles.muted}>
              {m.field} 人 · {MATCH_KIND_LABELS[m.kind]}
            </span>
            <span className={styles.matchDate}>{dateTime(m.at)}</span>
          </div>
          <div className={styles.matchBody}>
            {m.trackName}
            {m.kind === 'drag' ? '' : ` · ${m.laps} 圈`} · {m.bike} · {fmtRaceTime(m.kind, m.timeS)}
          </div>
          {m.kind === 'room' && (
            <div className={styles.matchRiders}>
              {[...m.riders]
                .sort((a, b) => a.position - b.position)
                .map((r) => `${r.position}. ${r.isMe ? '你' : r.name}`)
                .join('　')}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

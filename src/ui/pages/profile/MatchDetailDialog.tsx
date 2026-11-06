import { useState } from 'react';
import { MATCH_KIND_LABELS, type MatchRecord, type MatchRider } from '@/application';
import { AddFriend } from '../../components/friends/AddFriend';
import { PlayerCardDialog } from '../../components/friends/PlayerCardDialog';
import { fmtLap } from '../../race/circuit/format';
import friends from '../../components/friends/friends.module.css';
import { dateTime, fmtRaceTime, resultLabel } from './matchFormat';
import styles from './profile.module.css';

/** One race from the history: how it went, the full order, and the people in it. */
export function MatchDetailDialog({ match, onClose }: { match: MatchRecord; onClose: () => void }) {
  const [viewing, setViewing] = useState<MatchRider | null>(null);
  const vsAi = match.kind === 'circuit' || match.kind === 'drag';
  const order = [...match.riders].sort((a, b) => a.position - b.position);
  const people = order.filter((r) => !r.isMe && !vsAi);
  const noAccounts = people.length > 0 && people.every((r) => !r.accountName);

  if (viewing) {
    return (
      <PlayerCardDialog
        name={viewing.name}
        bike={viewing.bike}
        {...(viewing.accountName && { accountName: viewing.accountName })}
        onClose={() => setViewing(null)}
      />
    );
  }

  return (
    <div className={friends.backdrop} role="dialog" aria-label="比賽紀錄">
      <section className={friends.dialog} data-testid="match-detail">
        <h2>
          {resultLabel(match)} · {match.trackName}
        </h2>
        <dl className={styles.matchFacts}>
          <dt>模式</dt>
          <dd>{MATCH_KIND_LABELS[match.kind]}</dd>
          <dt>時間</dt>
          <dd>{dateTime(match.at)}</dd>
          <dt>{match.kind === 'drag' ? '距離' : '圈數'}</dt>
          <dd>{match.kind === 'drag' ? `${match.laps} m` : `${match.laps} 圈`}</dd>
          <dt>車款</dt>
          <dd>{match.bike}</dd>
          <dt>成績</dt>
          <dd>{fmtRaceTime(match.kind, match.timeS)}</dd>
          {match.bestLapS !== null && (
            <>
              <dt>最快圈</dt>
              <dd>{fmtLap(match.bestLapS)}</dd>
            </>
          )}
        </dl>

        <h3>完整成績（{match.field} 人）</h3>
        <ol className={styles.detailRiders}>
          {order.map((r) => (
            <li key={`${r.position}-${r.name}`} data-me={r.isMe || undefined}>
              <span className={styles.detailPos}>{r.position}</span>
              <span className={styles.detailName}>
                {r.isMe ? '你' : r.name}
                <small>
                  {vsAi && !r.isMe ? '電腦 · ' : ''}
                  {r.bike}
                </small>
              </span>
              <span className={styles.num}>{fmtRaceTime(match.kind, r.timeS)}</span>
              {!r.isMe && !vsAi && (
                <span className={styles.detailActions}>
                  <button
                    type="button"
                    className={friends.addFriend}
                    onClick={() => setViewing(r)}
                    data-testid="match-view-player"
                  >
                    查看
                  </button>
                  <AddFriend accountName={r.accountName} testId="match-add-friend" />
                </span>
              )}
            </li>
          ))}
        </ol>
        {noAccounts && (
          <p className={friends.note}>
            這場的對手沒有帳號資料（沒有登入，或是較早的紀錄），無法加好友。
          </p>
        )}
        <button type="button" className={friends.close} onClick={onClose} aria-label="關閉">
          ✕
        </button>
      </section>
    </div>
  );
}

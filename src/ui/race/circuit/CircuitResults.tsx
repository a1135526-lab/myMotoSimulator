import { useCallback, useState, type ReactNode } from 'react';
import type { CircuitView } from '@/application';
import { AddFriend } from '../../components/friends/AddFriend';
import { FinishSplash } from './FinishSplash';
import { fmtLap } from './format';
import { LapBoard } from './LapBoard';
import { RideGradeCard } from './RideGradeCard';
import { ItemStatsCard } from '../items/ItemStatsCard';
import styles from './results.module.css';

interface CircuitResultsProps {
  view: CircuitView;
  circuitId: string;
  onRematch: () => void;
  onGarage: () => void;
  /** Replaces the rematch / garage buttons (a friend room has its own). */
  actions?: ReactNode;
  /** Above the actions: points won (ranked), who you raced (online). */
  extra?: ReactNode;
}

/** The finish splash, then the results: finishers by time, then the rest by distance. */
export function CircuitResults(props: CircuitResultsProps) {
  // From your own flag: the others may still be racing (their times fill in).
  const home = props.view.riders[0]?.finishTimeS != null;
  if (props.view.phase !== 'finished' && !home) return null;
  return <Results {...props} />;
}

/** Seconds of slack before the race started, for marking its laps new. */
const NEW_SLACK_MS = 10_000;

function Results({ view, circuitId, onRematch, onGarage, actions, extra }: CircuitResultsProps) {
  // Laps set during this race are new; it lasted about raceTimeS.
  const [newSince] = useState(() => Date.now() - view.raceTimeS * 1000 - NEW_SLACK_MS);
  const order = [...view.riders].sort((a, b) => a.position - b.position);
  const winner = order[0]?.finishTimeS ?? null;
  const me = view.riders[0];
  const won = me?.position === 1 && !me.dnf;
  const final = view.phase === 'finished';
  const left = view.finishCountdownS;
  const [splash, setSplash] = useState(true);
  const endSplash = useCallback(() => setSplash(false), []);

  if (splash && me) {
    return (
      <FinishSplash
        position={me.position}
        field={view.riders.length}
        dnf={me.dnf === true}
        onDone={endSplash}
      />
    );
  }

  return (
    <div className={styles.resultBackdrop}>
      <section
        className={styles.result}
        role="dialog"
        aria-label="比賽結果"
        data-testid="circuit-result"
      >
        <p className={styles.kicker}>RACE RESULT · 結算</p>
        <h2 className={won ? styles.win : styles.lose}>
          {me?.dnf ? '未完賽' : won ? 'VICTORY 冠軍！' : `第 ${me?.position ?? '-'} 名`}
        </h2>
        {me && (
          <dl className={styles.summary}>
            <div>
              <dt>名次</dt>
              <dd>
                {me.dnf ? '—' : me.position}
                <small> / {view.riders.length}</small>
              </dd>
            </div>
            <div>
              <dt>總時間</dt>
              <dd>{fmtLap(me.finishTimeS)}</dd>
            </div>
            <div>
              <dt>最快圈</dt>
              <dd>{fmtLap(me.bestLapS)}</dd>
            </div>
          </dl>
        )}
        {view.grades && <RideGradeCard grades={view.grades} reactionS={view.player.reactionS} />}
        {view.items && <ItemStatsCard />}
        <table className={styles.resultTable}>
          <thead>
            <tr>
              <th scope="col">名次</th>
              <th scope="col">車手</th>
              <th scope="col">總時間</th>
              <th scope="col">最快圈</th>
            </tr>
          </thead>
          <tbody>
            {order.map((r) => (
              <tr key={r.name} className={r.isPlayer ? styles.me : undefined}>
                <td className={styles.pos} data-podium={r.position <= 3 ? r.position : undefined}>
                  {r.position}
                </td>
                <th scope="row">
                  {r.name} <AddFriend accountName={r.accountName} testId="result-add-friend" />
                </th>
                <td>
                  {r.finishTimeS === null
                    ? (r.remote || !final) && !r.dnf
                      ? '比賽中'
                      : '未完賽'
                    : r.position === 1 || winner === null
                      ? fmtLap(r.finishTimeS)
                      : `+${(r.finishTimeS - winner).toFixed(3)}`}
                </td>
                <td>{fmtLap(r.bestLapS)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!final && (
          <p className={styles.waitHost} role="status" data-testid="results-waiting">
            等待其他車手完賽{left != null ? ` · 剩 ${Math.ceil(left)} 秒` : '…'}
          </p>
        )}
        {extra}
        {!extra && <LapBoard circuitId={circuitId} newSince={newSince} />}
        {actions ?? (
          <div className={styles.resultActions}>
            <button type="button" className={styles.secondary} onClick={onGarage}>
              換車 / 改裝
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={onRematch}
              disabled={!final}
              autoFocus
            >
              再比一場 <kbd>Space</kbd>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  fetchDragBoard,
  fetchLapBoard,
  fetchLapGhost,
  fetchMissionBoard,
  missionCatalog,
  RANKED_GROUP_LABELS,
  useAuthStore,
  useCircuits,
  useTracks,
  useUiStore,
  type DragBoardRow,
  type LapBoardRow,
  type MissionBoardRow,
  type RankedGroup,
} from '@/application';
import { RankedBoard } from '../../race/ranked/RankedBoard';
import { fmtLap } from '../../race/circuit/format';
import { fmtRunTime, starText } from '../../street/missions/format';
import styles from './online.module.css';

type Tab = 'ranked' | 'laps' | 'drag' | 'missions';

type Board =
  | { kind: 'loading' }
  | { kind: 'error'; error: string }
  | { kind: 'laps'; rows: LapBoardRow[] }
  | { kind: 'drag'; rows: DragBoardRow[] }
  | { kind: 'missions'; rows: MissionBoardRow[] };

const date = (ms: number) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/** Everyone's best: ranked ladders, circuits (with and without assists), drag strips, missions. */
export function LeaderboardDialog({ onClose }: { onClose: () => void }) {
  const circuits = useCircuits();
  const tracks = useTracks().filter((t) => t.distanceM !== null);
  const missions = missionCatalog();
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const setRival = useUiStore((s) => s.setRivalGhost);
  const [tab, setTab] = useState<Tab>('laps');
  const [circuitId, setCircuitId] = useState(circuits[0]?.id ?? '');
  const [assisted, setAssisted] = useState(false);
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? '');
  const [missionId, setMissionId] = useState(missions[0]?.id ?? '');
  const [group, setGroup] = useState<RankedGroup>('scooter');
  const [board, setBoard] = useState<Board>({ kind: 'loading' });
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // The ranked ladder loads itself (RankedBoard).
    if (tab === 'ranked') return;
    let live = true;
    setBoard({ kind: 'loading' });
    const load = async (): Promise<Board> => {
      if (tab === 'laps') {
        const res = await fetchLapBoard(circuitId, assisted);
        return res.ok ? { kind: 'laps', rows: res.value } : { kind: 'error', error: res.error };
      }
      if (tab === 'drag') {
        const res = await fetchDragBoard(trackId);
        return res.ok ? { kind: 'drag', rows: res.value } : { kind: 'error', error: res.error };
      }
      const res = await fetchMissionBoard(missionId);
      return res.ok ? { kind: 'missions', rows: res.value } : { kind: 'error', error: res.error };
    };
    void load().then((b) => live && setBoard(b));
    return () => {
      live = false;
    };
  }, [tab, circuitId, assisted, trackId, missionId]);

  const race = async (row: LapBoardRow) => {
    setNote('下載幽靈車中…');
    const res = await fetchLapGhost(circuitId, assisted, row.nickname);
    if (!res.ok) return setNote(res.error);
    setRival({ circuitId, ghost: res.value });
    const name = circuits.find((c) => c.id === circuitId)?.name ?? '';
    setNote(`已設定：下次跑「${name}」，幽靈車就是 ${row.nickname} 的 ${fmtLap(row.lapS)}`);
  };

  const pick = <T extends string>(value: T, current: T, set: (v: T) => void, label: string) => (
    <button key={value} type="button" aria-pressed={value === current} onClick={() => set(value)}>
      {label}
    </button>
  );

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-label="全球排行榜"
      data-testid="leaderboard"
    >
      <div className={styles.dialog}>
        <h2>🏆 全球排行榜</h2>
        <p className={styles.lead}>
          {signedIn
            ? '你的成績會自動上傳，每個榜只留你的最佳成績。'
            : '用右上角的「登入」，你的成績也能上榜。'}
        </p>
        <div className={styles.tabs}>
          {pick<Tab>('ranked', tab, setTab, '🏆 排位')}
          {pick<Tab>('laps', tab, setTab, '賽道繞圈')}
          {pick<Tab>('drag', tab, setTab, '直線加速')}
          {pick<Tab>('missions', tab, setTab, '街景任務')}
        </div>

        {tab === 'laps' && (
          <>
            <div className={styles.chips}>
              {circuits.map((c) => pick(c.id, circuitId, setCircuitId, c.name))}
            </div>
            <div className={styles.chips}>
              {pick('off', assisted ? 'on' : 'off', () => setAssisted(false), '無輔助')}
              {pick('on', assisted ? 'on' : 'off', () => setAssisted(true), '有輔助')}
            </div>
          </>
        )}
        {tab === 'drag' && (
          <div className={styles.chips}>
            {tracks.map((t) => pick(t.id, trackId, setTrackId, `${t.name} ${t.distanceM} m`))}
          </div>
        )}
        {tab === 'missions' && (
          <div className={styles.chips}>
            {missions.map((m) => pick(m.id, missionId, setMissionId, `${m.icon} ${m.title}`))}
          </div>
        )}

        {tab === 'ranked' ? (
          <>
            <div className={styles.chips}>
              {(['scooter', 'manual'] as const).map((g) =>
                pick(g, group, setGroup, RANKED_GROUP_LABELS[g]),
              )}
            </div>
            <RankedBoard group={group} />
          </>
        ) : (
          <BoardTable board={board} onRace={(row) => void race(row)} />
        )}
        {note && <p className={styles.note}>{note}</p>}

        <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
          ✕
        </button>
      </div>
    </div>
  );
}

function BoardTable({ board, onRace }: { board: Board; onRace: (row: LapBoardRow) => void }) {
  if (board.kind === 'loading') return <p className={styles.note}>讀取中…</p>;
  if (board.kind === 'error') return <p className={styles.error}>{board.error}</p>;
  if (board.rows.length === 0) return <p className={styles.note}>還沒有人上榜，成為第一個吧！</p>;

  if (board.kind === 'laps') {
    return (
      <table className={styles.board}>
        <thead>
          <tr>
            <th>#</th>
            <th>玩家</th>
            <th>圈速</th>
            <th>車款</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {board.rows.map((r) => (
            <tr key={r.nickname} data-me={r.isMe || undefined}>
              <td>{r.rank}</td>
              <td>{r.nickname}</td>
              <td className={styles.num}>{fmtLap(r.lapS)}</td>
              <td className={styles.muted}>{r.bike}</td>
              <td>
                {!r.isMe && (
                  <button type="button" className={styles.rivalButton} onClick={() => onRace(r)}>
                    👻 挑戰
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (board.kind === 'drag') {
    return (
      <table className={styles.board}>
        <thead>
          <tr>
            <th>#</th>
            <th>玩家</th>
            <th>ET</th>
            <th>終點速度</th>
            <th>車款</th>
          </tr>
        </thead>
        <tbody>
          {board.rows.map((r) => (
            <tr key={r.nickname} data-me={r.isMe || undefined}>
              <td>{r.rank}</td>
              <td>{r.nickname}</td>
              <td className={styles.num}>{r.etS.toFixed(3)} s</td>
              <td className={styles.num}>{Math.round(r.trapKmh)} km/h</td>
              <td className={styles.muted}>
                {r.bike} · {date(r.at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <table className={styles.board}>
      <thead>
        <tr>
          <th>#</th>
          <th>玩家</th>
          <th>用時</th>
          <th>星等</th>
          <th>車款</th>
        </tr>
      </thead>
      <tbody>
        {board.rows.map((r) => (
          <tr key={r.nickname} data-me={r.isMe || undefined}>
            <td>{r.rank}</td>
            <td>{r.nickname}</td>
            <td className={styles.num}>{fmtRunTime(r.timeS)}</td>
            <td className={styles.stars}>{starText(r.stars)}</td>
            <td className={styles.muted}>{r.bike}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { useEffect, useState } from 'react';
import { fetchRankedBoard, type RankedBoardRow, type RankedGroup, tierOf } from '@/application';
import styles from './ranked.module.css';

/** A group's ladder: tier, points, games and wins. */
export function RankedBoard({ group }: { group: RankedGroup }) {
  const [rows, setRows] = useState<RankedBoardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    void fetchRankedBoard(group).then((res) => {
      if (!live) return;
      if (res.ok) setRows(res.value);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [group]);

  if (error) return <p className={styles.error}>{error}</p>;
  if (!rows) return <p className={styles.note}>讀取中…</p>;
  if (rows.length === 0) return <p className={styles.note}>還沒有人打過排位，成為第一個吧！</p>;
  return (
    <table className={styles.board} data-testid="ranked-board">
      <tbody>
        {rows.map((r) => {
          const { tier } = tierOf(r.points);
          return (
            <tr key={r.nickname} data-me={r.isMe || undefined}>
              <td>{r.rank}</td>
              <td>{r.nickname}</td>
              <td style={{ color: tier.color }}>{tier.name}</td>
              <td className={styles.num}>{r.points} 分</td>
              <td className={styles.num}>
                {r.games} 場 · 勝 {r.wins}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

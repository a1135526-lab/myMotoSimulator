import { useRecordsStore } from '@/application';
import { fmtLap } from './format';
import styles from './results.module.css';

const dateLabel = (ms: number) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

interface LapBoardProps {
  readonly circuitId: string;
  readonly limit?: number;
  /** Laps set at or after this time (ms) are marked new. */
  readonly newSince?: number;
}

/** This device's fastest clean laps on one circuit. */
export function LapBoard({ circuitId, limit = 5, newSince = Infinity }: LapBoardProps) {
  const laps = useRecordsStore((s) => s.laps[circuitId]) ?? [];
  if (laps.length === 0) {
    return (
      <p className={styles.boardEmpty} data-testid="lap-board">
        還沒有紀錄：跑完一圈不撞護欄或別的車、不按重置，就會記下來
      </p>
    );
  }
  return (
    <table className={styles.board} data-testid="lap-board">
      <caption>本機排行榜</caption>
      <tbody>
        {laps.slice(0, limit).map((r, i) => (
          <tr key={`${r.at}-${r.lapS}`} data-new={r.at >= newSince || undefined}>
            <td className={styles.pos} data-podium={i < 3 ? i + 1 : undefined}>
              {i + 1}
            </td>
            <td className={styles.boardTime}>{fmtLap(r.lapS)}</td>
            <th scope="row">
              {r.bike}
              {r.assisted && <small className={styles.boardTag}>輔助</small>}
              {r.at >= newSince && <small className={styles.boardNew}>NEW</small>}
            </th>
            <td className={styles.boardDate}>{dateLabel(r.at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

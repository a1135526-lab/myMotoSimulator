import type { CircuitView } from '@/application';
import { fmtLap } from './format';
import styles from './results.module.css';

interface CircuitResultsProps {
  view: CircuitView;
  onRematch: () => void;
  onGarage: () => void;
}

/** Final classification: finishers by time, then the rest by distance. */
export function CircuitResults({ view, onRematch, onGarage }: CircuitResultsProps) {
  if (view.phase !== 'finished') return null;
  const order = [...view.riders].sort((a, b) => a.position - b.position);
  const winner = order[0]?.finishTimeS ?? null;
  const me = view.riders[0];
  const won = me?.position === 1;

  return (
    <div className={styles.resultBackdrop}>
      <section
        className={styles.result}
        role="dialog"
        aria-label="比賽結果"
        data-testid="circuit-result"
      >
        <p className={styles.kicker}>FINAL CLASSIFICATION</p>
        <h2 className={won ? styles.win : styles.lose}>
          {won ? '冠軍！' : `第 ${me?.position ?? '-'} 名`}
        </h2>
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
                <th scope="row">{r.name}</th>
                <td>
                  {r.finishTimeS === null
                    ? '未完賽'
                    : r.position === 1 || winner === null
                      ? fmtLap(r.finishTimeS)
                      : `+${(r.finishTimeS - winner).toFixed(3)}`}
                </td>
                <td>{fmtLap(r.bestLapS)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.resultActions}>
          <button type="button" className={styles.secondary} onClick={onGarage}>
            換車 / 改裝
          </button>
          <button type="button" className={styles.primary} onClick={onRematch} autoFocus>
            再比一場 <kbd>Space</kbd>
          </button>
        </div>
      </section>
    </div>
  );
}

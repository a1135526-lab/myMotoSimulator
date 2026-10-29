import type { RaceView } from '@/application';
import styles from './race.module.css';

type Result = NonNullable<RaceView['result']>;
type RacerResult = Result['player'];

const fmt = (v: number | null, digits: number, unit: string) =>
  v === null ? '—' : `${v.toFixed(digits)} ${unit}`;

function headline(result: Result): string {
  if (result.winner === 'player') {
    return result.reason === 'falseStart' ? '你贏了！對手搶跑' : '你贏了！';
  }
  if (result.winner === 'opponent') {
    return result.reason === 'falseStart' ? '搶跑！紅燈犯規' : '你輸了';
  }
  return '比賽結束';
}

function Row({ label, r }: { label: string; r: RacerResult }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="tabular">{r.falseStart ? '搶跑' : fmt(r.reactionS, 3, 's')}</td>
      <td className="tabular">{fmt(r.elapsedS, 3, 's')}</td>
      <td className="tabular">{fmt(r.totalS, 3, 's')}</td>
      <td className="tabular">{fmt(r.trapSpeedKmh, 1, 'km/h')}</td>
    </tr>
  );
}

interface RaceResultCardProps {
  view: RaceView;
  onRematch: () => void;
  onGarage: () => void;
}

export function RaceResultCard({ view, onRematch, onGarage }: RaceResultCardProps) {
  const result = view.result;
  if (!result) return null;
  const won = result.winner === 'player';
  return (
    <div className={styles.resultBackdrop}>
      <section
        className={styles.result}
        role="dialog"
        aria-label="比賽結果"
        data-testid="race-result"
      >
        <h2 className={won ? styles.win : styles.lose}>{headline(result)}</h2>
        {result.marginS !== null && (
          <p className={styles.margin}>差距 {result.marginS.toFixed(3)} 秒</p>
        )}
        <table className={styles.resultTable}>
          <thead>
            <tr>
              <th />
              <th scope="col">反應</th>
              <th scope="col">ET</th>
              <th scope="col">總時間</th>
              <th scope="col">終點速度</th>
            </tr>
          </thead>
          <tbody>
            <Row label={`你（${view.player.label}）`} r={result.player} />
            <Row label={`對手（${view.opponent.label}）`} r={result.opponent} />
          </tbody>
        </table>
        <p className={styles.legend}>
          反應：綠燈到起步；ET：起步到終點；總時間 = 反應 + ET，決定勝負。
        </p>
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

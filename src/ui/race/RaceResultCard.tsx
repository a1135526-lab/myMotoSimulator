import { MIN_HUMAN_REACTION_S, type RaceView } from '@/application';
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

/** Why a false start was called: moved before green, or "reacted" faster than a human can. */
function falseStartNote(r: RacerResult): string | null {
  if (!r.falseStart) return null;
  const t = r.launchReactionS;
  if (t !== null && t >= 0) {
    return `起步反應 ${t.toFixed(3)} 秒，快於人體極限 ${MIN_HUMAN_REACTION_S.toFixed(1)} 秒，判定預判起步`;
  }
  return '綠燈亮起前就起步';
}

function Row({ label, r }: { label: string; r: RacerResult }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="tabular">
        {r.falseStart ? (
          <span className={styles.foul}>搶跑 {fmt(r.launchReactionS, 3, 's')}</span>
        ) : (
          fmt(r.launchReactionS, 3, 's')
        )}
      </td>
      <td className="tabular">{fmt(r.reactionS, 3, 's')}</td>
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
        {[result.player, result.opponent].map((r, i) => {
          const note = falseStartNote(r);
          return (
            note && (
              <p key={i} className={styles.foulNote} data-testid="false-start-note">
                {i === 0 ? '你' : '對手'}：{note}
              </p>
            )
          );
        })}
        {result.marginS !== null && (
          <p className={styles.margin}>差距 {result.marginS.toFixed(3)} 秒</p>
        )}
        <table className={styles.resultTable}>
          <thead>
            <tr>
              <th />
              <th scope="col">起步反應</th>
              <th scope="col">RT</th>
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
          起步反應：綠燈到你放煞車／放離合催油（低於 {MIN_HUMAN_REACTION_S}{' '}
          秒視為預判搶跑）；RT：綠燈到車輪離開起跑光束；ET：光束到終點；總時間 = RT + ET，決定勝負。
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

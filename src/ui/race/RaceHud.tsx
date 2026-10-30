import type { RaceView } from '@/application';
import { BikeDashboard } from '../components/dashboard/BikeDashboard';
import styles from './race.module.css';

const PHASE_HINT: Record<RaceView['phase'], string> = {
  staged: '已就位。按 Space 開始倒數',
  countdown: '注意燈號… 第一顆黃燈起自己按住車（↓ 煞車或拉離合），綠燈再起步',
  racing: '',
  finished: '',
};

function Tree({ view }: { view: RaceView }) {
  return (
    <div className={styles.tree} aria-label="起跑燈" data-testid="race-tree">
      {view.lights.ambers.map((on, i) => (
        <span key={i} className={on ? styles.amberOn : styles.bulb} />
      ))}
      <span
        className={view.lights.green ? styles.greenOn : styles.bulb}
        data-testid="green-light"
      />
      <span className={view.redLights.player ? styles.redOn : styles.bulb} />
    </div>
  );
}

function Progress({ view }: { view: RaceView }) {
  const pos = (m: number) => `${Math.min(100, (m / view.distanceM) * 100)}%`;
  return (
    <div className={styles.progress} aria-hidden>
      <span className={styles.progressPlayer} style={{ left: pos(view.player.distanceM) }} />
      <span className={styles.progressOpponent} style={{ left: pos(view.opponent.distanceM) }} />
    </div>
  );
}

export function RaceHud({ view }: { view: RaceView }) {
  const { player, phase } = view;
  const gap = view.gapM;
  const reaction = view.playerReactionS;
  const hint = !player.engineRunning
    ? '熄火！空檔或拉離合後按 Enter 發動'
    : view.redLights.player
      ? '搶跑！紅燈犯規'
      : phase === 'racing' && reaction !== null
        ? `起步反應 ${reaction.toFixed(3)} 秒`
        : PHASE_HINT[phase];
  return (
    <div className={styles.hud}>
      <div className={styles.hudTop}>
        <Tree view={view} />
        <div className={styles.hudCenter}>
          {hint && (
            <p className={styles.hint} data-testid="race-hint">
              {hint}
            </p>
          )}
          {phase === 'racing' && (
            <p className={`${styles.clock} tabular`}>{Math.max(0, view.raceTimeS).toFixed(2)} s</p>
          )}
          <Progress view={view} />
        </div>
        <div className={`${styles.gap} tabular`} data-testid="race-gap">
          {phase === 'staged' ? '—' : `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} m`}
          {phase !== 'staged' && <small>{gap >= 0 ? '領先' : '落後'}</small>}
        </div>
      </div>
      <div className={styles.hudBottom}>
        <div className={styles.dashSlot} data-layout={player.dash.layout}>
          <BikeDashboard
            model={player.dash}
            readings={{
              speedKmh: player.speedKmh,
              rpm: player.rpm,
              gearLabel: player.gearLabel,
              engineRunning: player.engineRunning,
              revLimiter: player.revLimiter,
              tripKm: player.distanceM / 1000,
            }}
            speedTestId="race-speed"
            gearTestId="race-gear"
          />
        </div>
        <span className={`${styles.remaining} tabular`}>
          {Math.max(0, view.distanceM - player.distanceM).toFixed(0)} m
        </span>
      </div>
    </div>
  );
}

import type { RacerView, RaceView } from '@/application';
import styles from './race.module.css';

const PHASE_HINT: Record<RaceView['phase'], string> = {
  staged: '已就位。按 Space 開始倒數',
  countdown: '注意燈號…',
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

function RpmBar({ racer }: { racer: RacerView }) {
  const pct = Math.min(100, (racer.rpm / (racer.redlineRpm * 1.08)) * 100);
  const red = racer.rpm >= racer.redlineRpm * 0.93;
  return (
    <div className={styles.rpmBar}>
      <div className={red ? styles.rpmFillRed : styles.rpmFill} style={{ width: `${pct}%` }} />
      <span className="tabular">{Math.round(racer.rpm).toLocaleString('en-US')} rpm</span>
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
  const hint = !player.engineRunning ? '熄火！空檔或拉離合後按 Enter 發動' : PHASE_HINT[phase];
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
        {player.gearLabel !== null && (
          <span className={styles.gear} data-testid="race-gear">
            {player.gearLabel}
          </span>
        )}
        <div className={styles.speed}>
          <strong className="tabular" data-testid="race-speed">
            {Math.floor(player.speedKmh)}
          </strong>
          <small>km/h</small>
        </div>
        <RpmBar racer={player} />
        <span className={`${styles.remaining} tabular`}>
          {Math.max(0, view.distanceM - player.distanceM).toFixed(0)} m
        </span>
      </div>
    </div>
  );
}

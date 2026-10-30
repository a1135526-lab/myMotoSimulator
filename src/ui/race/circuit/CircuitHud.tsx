import type { CSSProperties } from 'react';
import { MIN_HUMAN_REACTION_S, type CameraMode, type CircuitView } from '@/application';
import { CircuitMap } from './CircuitMap';
import { fmtLap } from './format';
import { Cluster } from './hud/Cluster';
import { LeanDrift } from './hud/LeanDrift';
import { GO_FLASH_S, StartGantry } from './hud/StartGantry';
import { TimingTower } from './hud/TimingTower';
import styles from './hud/hud.module.css';

/** Speed at which the edge vignette is fully on, km/h. */
const VIGNETTE_FULL_KMH = 260;
const PERCENT = 100;

const HINTS: Partial<Record<CircuitView['phase'], string>> = {
  grid: '在起跑格上 · 按 Space 開始亮燈',
  lights: '按住 ↓ 煞車（可同時催油）· 紅燈熄滅後放開起跑',
};
/** How long the reaction time stays up after the start, s. */
const REACTION_SHOW_S = 3;

type Alert = { text: string; tone: 'info' | 'warn' | 'danger' };

function alertFor(view: CircuitView): Alert | null {
  const me = view.riders[0];
  if (!me) return null;
  if (me.crashed) return { text: '摔車！稍後回到賽道', tone: 'danger' };
  if (!me.engineRunning) return { text: '熄火 · 空檔或拉離合後按 Enter', tone: 'warn' };
  const { penaltyLeftS, reactionS, jumpStart } = view.player;
  if (penaltyLeftS !== null) {
    const why =
      reactionS !== null && reactionS >= 0
        ? `反應 ${reactionS.toFixed(3)} 秒，快於人體極限 ${MIN_HUMAN_REACTION_S} 秒`
        : '紅燈熄滅前起步';
    return { text: `偷跑！${why} · 罰停 ${penaltyLeftS.toFixed(1)} 秒`, tone: 'danger' };
  }
  if (view.player.offTrack) return { text: '衝出賽道', tone: 'danger' };
  if (view.phase === 'racing' && !jumpStart && reactionS !== null) {
    if (view.raceTimeS < reactionS + REACTION_SHOW_S) {
      return { text: `起步反應 ${reactionS.toFixed(3)} 秒`, tone: 'info' };
    }
  }
  const hint = HINTS[view.phase];
  return hint ? { text: hint, tone: 'info' } : null;
}

/** Last lap against the best: purple when it is the best, else the delta. */
function LapTimes({ view }: { view: CircuitView }) {
  const { player } = view;
  const isBest = player.lastLapS !== null && player.lastLapS === player.bestLapS;
  const delta =
    player.lastLapS !== null && player.bestLapS !== null && !isBest
      ? player.lastLapS - player.bestLapS
      : null;
  return (
    <div className={styles.laps}>
      <div className={styles.lapHead} data-testid="race-lap">
        LAP <strong>{player.lap}</strong>/{view.laps}
      </div>
      <div className={styles.lapNow}>{fmtLap(player.currentLapS)}</div>
      <dl className={styles.lapList}>
        <dt>LAST</dt>
        <dd className={isBest ? styles.purple : undefined}>
          {fmtLap(player.lastLapS)}
          {delta !== null && <small className={styles.slower}> +{delta.toFixed(3)}</small>}
        </dd>
        <dt>BEST</dt>
        <dd className={styles.purple}>{fmtLap(player.bestLapS)}</dd>
      </dl>
    </div>
  );
}

export function CircuitHud({ view, camera }: { view: CircuitView; camera: CameraMode }) {
  const me = view.riders[0];
  if (!me) return null;
  const { player } = view;
  const alert = alertFor(view);
  const showGantry =
    view.phase === 'grid' ||
    view.phase === 'lights' ||
    (view.phase === 'racing' && view.raceTimeS < GO_FLASH_S);
  const vignette = Math.min(1, me.speedKmh / VIGNETTE_FULL_KMH);

  return (
    <div className={styles.hud}>
      <div
        className={styles.vignette}
        style={{ opacity: vignette, '--drift': player.driftPct / PERCENT } as CSSProperties}
        aria-hidden
      />

      <div className={styles.topLeft}>
        <div className={styles.position} data-testid="race-position">
          <span>P</span>
          {me.position}
          <small>/{view.riders.length}</small>
        </div>
        <TimingTower riders={view.riders} />
      </div>

      <div className={styles.topCenter}>
        <LapTimes view={view} />
        {showGantry && <StartGantry lit={view.lightsLit} go={view.phase === 'racing'} />}
        {alert && (
          <p className={styles.alert} data-tone={alert.tone} data-testid="circuit-hint">
            {alert.text}
          </p>
        )}
      </div>

      <div className={styles.topRight}>
        <div className={styles.minimap}>
          <CircuitMap
            samples={view.geo.samples}
            dots={view.riders.map((r) => ({ x: r.x, z: r.z, player: r.isPlayer }))}
          />
        </div>
        {player.gapAheadM !== null && (
          <div className={styles.gapAhead}>
            前車 <strong>{player.gapAheadM.toFixed(0)}</strong> m
          </div>
        )}
      </div>

      <div className={styles.bottomLeft}>
        <LeanDrift leanDeg={player.leanDeg} driftPct={player.driftPct} />
        <span className={styles.camera}>
          {camera === 'first' ? '第一人稱' : '第三人稱'} <kbd>V</kbd>
        </span>
      </div>

      <div className={styles.bottomRight}>
        <Cluster
          dash={view.dash}
          readings={{
            speedKmh: me.speedKmh,
            rpm: me.rpm,
            gearLabel: player.gearLabel,
            engineRunning: me.engineRunning,
            revLimiter: me.revLimiter,
            tripKm: Math.max(0, me.progressM) / 1000,
          }}
          throttle={player.throttlePct / PERCENT}
          brake={player.brakePct / PERCENT}
        />
      </div>
    </div>
  );
}

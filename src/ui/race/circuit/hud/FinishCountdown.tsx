import type { CircuitView } from '@/application';
import styles from './hud.module.css';

/** Once the winner is home, the clock everyone else races: a small pill at the top. */
export function FinishCountdown({ view }: { view: CircuitView }) {
  const left = view.finishCountdownS;
  if (left === null || left === undefined) return null;
  const me = view.riders[0];
  const home = me?.finishTimeS !== null && me?.finishTimeS !== undefined;
  const seconds = Math.ceil(left);
  if (home) {
    return (
      <p className={styles.countdownWait} role="status" data-testid="finish-countdown">
        等待其他玩家完賽 · 剩 {seconds} 秒
      </p>
    );
  }
  return (
    <p
      className={styles.countdown}
      data-urgent={left <= 5 || undefined}
      role="timer"
      data-testid="finish-countdown"
    >
      🏁 第一名已完賽 · <strong>{seconds}</strong> 秒內過線
    </p>
  );
}

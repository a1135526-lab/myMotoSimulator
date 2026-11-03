import type { CircuitView } from '@/application';
import styles from './hud.module.css';

/** Friend room: once the winner is home, the clock everyone else races. */
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
    <div
      className={styles.countdown}
      data-urgent={left <= 5 || undefined}
      role="timer"
      data-testid="finish-countdown"
    >
      <span>🏁 第一名已完賽！</span>
      <strong>{seconds}</strong>
      <small>秒內沒過終點線就算未完賽</small>
    </div>
  );
}

import type { PointerEvent } from 'react';
import type { TouchControl } from '@/application';
import styles from './controls.module.css';

interface TouchControlsProps {
  manual: boolean;
  /** Circuit racing: add lean-left / lean-right buttons. */
  steering?: boolean;
  onPress: (control: TouchControl) => void;
  onRelease: (control: TouchControl) => void;
  onReset: () => void;
  onShift: (direction: 1 | -1) => void;
  onStart: () => void;
}

/** Hold-to-press buttons; pointer capture keeps them held while the finger drifts. */
export function TouchControls({
  manual,
  steering = false,
  onPress,
  onRelease,
  onReset,
  onShift,
  onStart,
}: TouchControlsProps) {
  const bind = (control: TouchControl) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      onPress(control);
    },
    onPointerUp: () => onRelease(control),
    onPointerCancel: () => onRelease(control),
    onLostPointerCapture: () => onRelease(control),
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  });

  return (
    <div className={styles.controls} aria-label="觸控操作">
      {manual && (
        <div className={styles.manualRow}>
          <button type="button" className={styles.clutch} {...bind('clutch')}>
            離合
          </button>
          <button type="button" className={styles.shift} onClick={() => onShift(-1)}>
            降檔
          </button>
          <button type="button" className={styles.shift} onClick={() => onShift(1)}>
            升檔
          </button>
          <button type="button" className={styles.start} onClick={onStart}>
            發動
          </button>
        </div>
      )}
      {steering && (
        <div className={styles.steerRow}>
          <button type="button" className={styles.steer} {...bind('steerLeft')}>
            ◀ 左傾
          </button>
          <button type="button" className={styles.steer} {...bind('steerRight')}>
            右傾 ▶
          </button>
        </div>
      )}
      <div className={styles.touch}>
        <button type="button" className={styles.brake} {...bind('brake')}>
          煞車
        </button>
        <button type="button" className={styles.reset} onClick={onReset}>
          重置
        </button>
        <button type="button" className={styles.throttle} {...bind('throttle')}>
          油門
        </button>
      </div>
    </div>
  );
}

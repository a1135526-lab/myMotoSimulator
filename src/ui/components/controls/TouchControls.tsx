import { useEffect, useRef, type PointerEvent } from 'react';
import type { TouchControl } from '@/application';
import styles from './controls.module.css';

interface TouchControlsProps {
  manual: boolean;
  /** Circuit racing: add lean-left / lean-right buttons. */
  steering?: boolean;
  /** Street riding: a hold-to-paddle-backwards button next to the steering. */
  reverse?: boolean;
  onPress: (control: TouchControl) => void;
  onRelease: (control: TouchControl) => void;
  onReset: () => void;
  onShift: (direction: 1 | -1) => void;
  onStart: () => void;
}

/** A click this soon after a finger press is the browser's echo of that press. */
const CLICK_ECHO_MS = 800;

/**
 * Hold-to-press buttons, any number of fingers at once.
 *
 * iOS Safari ignores `touch-action: none`: a finger that drifts a little
 * becomes a page scroll, and a second finger a pinch-zoom, and either one
 * cancels the pointers, letting go of the throttle mid-hold. Cancelling the
 * native touches on this panel stops those gestures, but also stops the
 * click that would follow a tap, so tap buttons fire on the finger going down.
 */
export function TouchControls({
  manual,
  steering = false,
  reverse = false,
  onPress,
  onRelease,
  onReset,
  onShift,
  onStart,
}: TouchControlsProps) {
  const panel = useRef<HTMLDivElement>(null);
  /** Fingers / mouse buttons holding each control. */
  const holders = useRef(new Map<TouchControl, Set<number>>());
  const lastTouchMs = useRef(-Infinity);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const block = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    // React registers touch listeners as passive, so they can't cancel; add our own.
    el.addEventListener('touchstart', block, { passive: false });
    el.addEventListener('touchmove', block, { passive: false });
    return () => {
      el.removeEventListener('touchstart', block);
      el.removeEventListener('touchmove', block);
    };
  }, []);

  const bind = (control: TouchControl) => {
    const up = (e: PointerEvent<HTMLButtonElement>) => {
      const held = holders.current.get(control);
      if (!held?.delete(e.pointerId) || held.size > 0) return;
      delete e.currentTarget.dataset.pressed;
      onRelease(control);
    };
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        // Touch is captured to the button already; a mouse needs it to release off the button.
        if (e.pointerType !== 'touch') {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Pointer already gone; its pointerup will still arrive or never mattered.
          }
        }
        const held = holders.current.get(control) ?? new Set<number>();
        holders.current.set(control, held);
        held.add(e.pointerId);
        // :active doesn't reliably light up once the native touch is cancelled.
        e.currentTarget.dataset.pressed = '';
        if (held.size === 1) onPress(control);
      },
      onPointerUp: up,
      onPointerCancel: up,
      onLostPointerCapture: up,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    };
  };

  /** One-shot buttons: on the finger going down for touch, on click otherwise (mouse, keyboard). */
  const tap = (action: () => void) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.pointerType !== 'touch') return;
      lastTouchMs.current = performance.now();
      e.currentTarget.dataset.pressed = '';
      action();
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => delete e.currentTarget.dataset.pressed,
    onPointerCancel: (e: PointerEvent<HTMLButtonElement>) => delete e.currentTarget.dataset.pressed,
    onClick: () => {
      if (performance.now() - lastTouchMs.current < CLICK_ECHO_MS) return;
      action();
    },
  });

  return (
    <div className={styles.controls} aria-label="觸控操作" ref={panel}>
      {manual && (
        <div className={styles.manualRow}>
          <button type="button" className={styles.clutch} {...bind('clutch')}>
            離合
          </button>
          <button type="button" className={styles.shift} {...tap(() => onShift(-1))}>
            降檔
          </button>
          <button type="button" className={styles.shift} {...tap(() => onShift(1))}>
            升檔
          </button>
          <button type="button" className={styles.start} {...tap(onStart)}>
            發動
          </button>
        </div>
      )}
      {steering && (
        <div className={styles.steerRow} data-reverse={reverse || undefined}>
          <button type="button" className={styles.steer} {...bind('steerLeft')}>
            ◀ 左傾
          </button>
          {reverse && (
            <button type="button" className={styles.reverse} {...bind('reverse')}>
              倒車
            </button>
          )}
          <button type="button" className={styles.steer} {...bind('steerRight')}>
            右傾 ▶
          </button>
        </div>
      )}
      <div className={styles.touch}>
        <button type="button" className={styles.brake} {...bind('brake')}>
          煞車
        </button>
        <button type="button" className={styles.reset} {...tap(onReset)}>
          重置
        </button>
        <button type="button" className={styles.throttle} {...bind('throttle')}>
          油門
        </button>
      </div>
    </div>
  );
}

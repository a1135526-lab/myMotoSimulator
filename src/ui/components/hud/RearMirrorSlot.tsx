import { useUiStore } from '@/application';
import styles from './mirror.module.css';

/**
 * The rear-view mirror's frame. The 3D renderer finds it (data-mirror-slot)
 * every frame and draws the view behind into it, so the HUD decides where it
 * goes and everything else lays out around it.
 */
export function RearMirrorSlot() {
  const on = useUiStore((s) => s.mirrorOn);
  if (!on) return null;
  return <div className={styles.mirror} data-mirror-slot data-testid="rear-mirror" aria-hidden />;
}

/** Turn the rear-view mirror on or off (remembered). */
export function MirrorToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const on = useUiStore((s) => s.mirrorOn);
  const setOn = useUiStore((s) => s.setMirrorOn);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      aria-label="後照鏡"
      title="畫面上方顯示後方的車"
      onClick={() => setOn(!on)}
      data-testid="mirror-toggle"
    >
      {compact ? '🪞' : `🪞 後照鏡 ${on ? '開' : '關'}`}
    </button>
  );
}

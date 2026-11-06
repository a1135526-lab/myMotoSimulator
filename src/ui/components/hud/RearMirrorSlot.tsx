import { useUiStore } from '@/application';
import styles from './mirror.module.css';

/**
 * The rear-view mirror's frame, there only while the mirror is held. The 3D
 * renderer finds it (data-mirror-slot) every frame and draws the view behind
 * into it, so the HUD decides where it goes and everything else lays out
 * around it.
 */
export function RearMirrorSlot() {
  const held = useUiStore((s) => s.mirrorHeld);
  if (!held) return null;
  return <div className={styles.mirror} data-mirror-slot data-testid="rear-mirror" aria-hidden />;
}

/** Hold to look in the rear-view mirror (like B on the keyboard); let go to close it. */
export function MirrorButton({ className, compact }: { className?: string; compact?: boolean }) {
  const held = useUiStore((s) => s.mirrorHeld);
  const setHeld = useUiStore((s) => s.setMirrorHeld);
  const release = () => setHeld(false);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={held}
      aria-label="後照鏡（按住）"
      title="按住看後照鏡，放開就關閉（鍵盤 B）"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setHeld(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none', userSelect: 'none' }}
      data-testid="mirror-button"
    >
      {compact ? '🪞' : '🪞 按住看後照鏡（B）'}
    </button>
  );
}

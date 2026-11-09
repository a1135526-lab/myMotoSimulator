import { useHornStore } from '@/application';

/** Hold to sound the horn (like H on the keyboard). */
export function HornButton({ className, compact }: { className?: string; compact?: boolean }) {
  const held = useHornStore((s) => s.held);
  const setHeld = useHornStore((s) => s.setHeld);
  const release = () => setHeld(false);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={held}
      aria-label="喇叭（按住）"
      title="按住按喇叭（鍵盤 H）"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setHeld(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none', userSelect: 'none' }}
      data-testid="horn-button"
    >
      {compact ? '📯' : '📯 喇叭（H）'}
    </button>
  );
}

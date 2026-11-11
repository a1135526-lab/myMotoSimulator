import { flashesLeft, useCircuitStore, useFlashStore } from '@/application';

/** Flash the headlight (like F on the keyboard): night circuits only, three a race. */
export function FlashButton({ className, compact }: { className?: string; compact?: boolean }) {
  const night = useFlashStore((s) => s.night);
  const left = useFlashStore(flashesLeft);
  const racing = useCircuitStore((s) => s.view?.phase === 'racing');
  if (!night) return null;
  return (
    <button
      type="button"
      className={className}
      aria-label={`閃大燈，剩 ${left} 次`}
      title="閃大燈，前方附近的對手畫面會一白（鍵盤 F，每場 3 次）"
      disabled={!racing || left <= 0}
      onClick={() => useFlashStore.getState().flash()}
      data-testid="flash-button"
    >
      {compact ? `💡${left}` : `💡 閃大燈（F）· 剩 ${left}`}
    </button>
  );
}

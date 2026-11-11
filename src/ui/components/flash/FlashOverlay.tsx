import { useFlashStore } from '@/application';
import styles from './flash.module.css';

/**
 * Over the race picture, never in the way of a tap: a see-through white-out
 * when someone behind flashes you, and your own beam lighting the road ahead.
 */
export function FlashOverlay() {
  const dazzledAt = useFlashStore((s) => s.dazzledAt);
  const flashedAt = useFlashStore((s) => s.flashedAt);
  return (
    <>
      {flashedAt !== null && <div key={`beam-${flashedAt}`} className={styles.beam} aria-hidden />}
      {dazzledAt !== null && (
        <div
          key={`dazzle-${dazzledAt}`}
          className={styles.dazzle}
          role="status"
          aria-label="被後方的車閃大燈"
          data-testid="flash-dazzle"
        />
      )}
    </>
  );
}

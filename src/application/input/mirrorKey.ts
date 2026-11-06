import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';

const MIRROR_KEY = 'KeyB';

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

/**
 * Hold B to look in the rear-view mirror; let go and it's gone. Not a riding
 * input, so it stays out of the input sources. Released on blur and unmount
 * so the mirror never sticks on.
 */
export function useMirrorKey(): void {
  useEffect(() => {
    const set = useUiStore.getState().setMirrorHeld;
    const down = (e: KeyboardEvent) => {
      if (e.code === MIRROR_KEY && !e.repeat && !isEditable(e.target)) set(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === MIRROR_KEY) set(false);
    };
    const release = () => set(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      release();
    };
  }, []);
}

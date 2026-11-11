import { useEffect } from 'react';
import { useFlashStore } from '../stores/flashStore';
import { useHornStore } from '../stores/hornStore';
import { useUiStore } from '../stores/uiStore';

const MIRROR_KEY = 'KeyB';
const HORN_KEY = 'KeyH';
const FLASH_KEY = 'KeyF';

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

/**
 * A key that's on only while held. Not a riding input, so it stays out of the
 * input sources. Released on blur and unmount so it never sticks on.
 */
function useHeldKey(code: string, set: (held: boolean) => void): void {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === code && !e.repeat && !isEditable(e.target)) set(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === code) set(false);
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
  }, [code, set]);
}

/** Hold B to look in the rear-view mirror; let go and it's gone. */
export const useMirrorKey = () => useHeldKey(MIRROR_KEY, useUiStore.getState().setMirrorHeld);

/** Hold H to sound the horn. */
export const useHornKey = () => useHeldKey(HORN_KEY, useHornStore.getState().setHeld);

/** Press F to flash the headlight (night circuits, three a race). */
export function useFlashKey(): void {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === FLASH_KEY && !e.repeat && !isEditable(e.target)) {
        useFlashStore.getState().flash();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);
}

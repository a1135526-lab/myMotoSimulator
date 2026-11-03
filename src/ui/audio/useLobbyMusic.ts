import { useEffect } from 'react';
import { useUiStore } from '@/application';
import { lobbyMusic } from './lobbyMusic';

/** Pages using the music right now; it fades out once none are. */
let users = 0;
let stopTimer: number | null = null;
/** Moving between two lobby pages unmounts one before mounting the next: don't stop in between. */
const HANDOVER_MS = 150;

/** Plays the lobby music while this page is up (and music is on). */
export function useLobbyMusic(): void {
  const on = useUiStore((s) => s.musicOn);
  useEffect(() => {
    if (typeof AudioContext === 'undefined') return;
    if (!on) {
      lobbyMusic.stop();
      return;
    }
    users += 1;
    if (stopTimer !== null) window.clearTimeout(stopTimer);
    try {
      lobbyMusic.start();
    } catch {
      return;
    }
    // Browsers hold sound back until the page has been clicked or typed on.
    const unlock = () => lobbyMusic.resume();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      users -= 1;
      stopTimer = window.setTimeout(() => {
        if (users === 0) lobbyMusic.stop();
      }, HANDOVER_MS);
    };
  }, [on]);
}

import { useEffect } from 'react';
import { useHornKey, useHornStore, useRemoteHornStore } from '@/application';
import { hornContext, soundHorn, type StopHorn } from './hornSounds';

/** Other players' horns are a bit quieter than your own. */
const REMOTE_HORN_GAIN = 0.6;

/**
 * The horn on a riding page: H or the 📯 button, plus other players' horns
 * in a friend room. Sounds even with the engine sound off — honking is
 * always on purpose.
 */
export function useHorn(): void {
  useHornKey();
  useEffect(() => {
    let stop: StopHorn | null = null;
    const remote = new Map<string, StopHorn>();
    const mine = useHornStore.subscribe((s, prev) => {
      if (s.held === prev.held) return;
      stop?.();
      stop = null;
      if (!s.held) return;
      const ctx = hornContext();
      if (ctx) stop = soundHorn(ctx, ctx.destination, s.preset, s.clip);
    });
    const theirs = useRemoteHornStore.subscribe((s) => {
      for (const [id, horn] of Object.entries(s.horns)) {
        const playing = remote.get(id);
        if (horn.on && !playing) {
          const ctx = hornContext();
          if (!ctx) continue;
          const out = ctx.createGain();
          out.gain.value = REMOTE_HORN_GAIN;
          out.connect(ctx.destination);
          remote.set(id, soundHorn(ctx, out, horn.preset, horn.clip));
        } else if (!horn.on && playing) {
          playing();
          remote.delete(id);
        }
      }
      for (const [id, playing] of remote) {
        if (!s.horns[id]) {
          playing();
          remote.delete(id);
        }
      }
    });
    return () => {
      mine();
      theirs();
      stop?.();
      remote.forEach((playing) => playing());
    };
  }, []);
}

import { useEffect } from 'react';
import {
  hornDistanceM,
  hornGain,
  useHornKey,
  useHornStore,
  useRemoteHornStore,
} from '@/application';
import { hornContext, soundHorn, type StopHorn } from './hornSounds';

/** Volume follows the other bike this fast, s. */
const GAIN_GLIDE_S = 0.05;

interface Playing {
  readonly stop: StopHorn;
  readonly out: GainNode;
}

/**
 * The horn on a riding page: H or the 📯 button, plus other players' horns
 * in a friend room — loud close by, fading with distance, silent far away.
 * Sounds even with the engine sound off: honking is always on purpose.
 */
export function useHorn(): void {
  useHornKey();
  useEffect(() => {
    let stop: StopHorn | null = null;
    const remote = new Map<string, Playing>();
    const end = (id: string) => {
      remote.get(id)?.stop();
      remote.delete(id);
    };
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
        if (horn.on && !remote.has(id)) {
          const ctx = hornContext();
          if (!ctx) continue;
          const out = ctx.createGain();
          out.gain.value = hornGain(hornDistanceM(id));
          out.connect(ctx.destination);
          remote.set(id, { stop: soundHorn(ctx, out, horn.preset, horn.clip), out });
        } else if (!horn.on) {
          end(id);
        }
      }
      for (const id of [...remote.keys()]) if (!s.horns[id]) end(id);
    });
    // Bikes move while they honk: keep each horn's volume on its distance.
    let frame = 0;
    const follow = () => {
      for (const [id, { out }] of remote) {
        out.gain.setTargetAtTime(
          hornGain(hornDistanceM(id)),
          out.context.currentTime,
          GAIN_GLIDE_S,
        );
      }
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => {
      cancelAnimationFrame(frame);
      mine();
      theirs();
      stop?.();
      for (const id of [...remote.keys()]) end(id);
    };
  }, []);
}

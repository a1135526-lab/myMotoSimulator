import { useEffect } from 'react';
import { useItemStore, useUiStore } from '@/application';
import { hornContext } from './hornSounds';
import { playItemCue } from './itemSounds';

/** Item race sounds on the circuit page: picks, uses, hits, blocks. Silent with the sound off. */
export function useItemSounds(): void {
  useEffect(
    () =>
      useItemStore.subscribe((s, prev) => {
        if (!s.cue || s.cue === prev.cue || !useUiStore.getState().soundOn) return;
        const ctx = hornContext();
        if (ctx) playItemCue(ctx, ctx.destination, s.cue.kind);
      }),
    [],
  );
}

import { create } from 'zustand';
import type { ItemId } from '@/domain';
import { useCircuitStore } from './circuitStore';

/** A short line on the HUD after an item lands (or is blocked). */
export interface ItemToast {
  readonly text: string;
  readonly tone: 'bad' | 'good' | 'info';
  /** performance.now() when it was raised, so a repeat shows again. */
  readonly at: number;
}

/** Your items this race, for the results. */
export interface ItemStats {
  readonly used: number;
  /** Your items that got someone. */
  readonly landed: number;
  /** Times you were got (shield blocks don't count). */
  readonly taken: number;
  readonly picks: Readonly<Partial<Record<ItemId, number>>>;
}

export const NO_ITEM_STATS: ItemStats = { used: 0, landed: 0, taken: 0, picks: {} };

/** A sound to play for something that happened to you with items. */
export type ItemCue =
  | 'pick'
  | 'boost'
  | 'drop'
  | 'shoot'
  | 'shield'
  | 'flash'
  | 'skate'
  | 'hit'
  | 'block'
  | 'landed'
  | 'skated';

interface ItemStoreState {
  readonly toast: ItemToast | null;
  readonly stats: ItemStats;
  /** The latest sound to play; `at` changes every time, so a repeat plays again. */
  readonly cue: { readonly kind: ItemCue; readonly at: number } | null;
  show(text: string, tone: ItemToast['tone']): void;
  play(kind: ItemCue): void;
  count(patch: (s: ItemStats) => ItemStats): void;
}

export const useItemStore = create<ItemStoreState>()((set) => ({
  toast: null,
  stats: NO_ITEM_STATS,
  cue: null,
  show: (text, tone) => set({ toast: { text, tone, at: performance.now() } }),
  play: (kind) =>
    set((s) => ({ cue: { kind, at: Math.max(performance.now(), (s.cue?.at ?? 0) + 1e-3) } })),
  count: (patch) => set((s) => ({ stats: patch(s.stats) })),
}));

/** The item you picked most this race, or null. */
export function mostPicked(stats: ItemStats): ItemId | null {
  let best: ItemId | null = null;
  let n = 0;
  for (const [item, k] of Object.entries(stats.picks) as [ItemId, number][]) {
    if (k > n) [best, n] = [item, k];
  }
  return best;
}

// Every race starts with the lights: fresh stats, no line left up.
useCircuitStore.subscribe((s, prev) => {
  if (s.view?.phase === 'lights' && prev.view?.phase !== 'lights') {
    useItemStore.setState({ stats: NO_ITEM_STATS, toast: null });
  }
});

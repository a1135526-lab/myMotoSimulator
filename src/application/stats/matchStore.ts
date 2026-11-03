import { create } from 'zustand';
import { useAuthStore } from '../online/authStore';
import { errorText, supabase } from '../online/supabase';
import { parseMatch, type MatchRecord } from './matchTypes';

/**
 * Your race history: kept on this device, and — once signed in — mirrored
 * to your account so it's there on every device. Newest first.
 */

const KEY = 'scooter-dyno:matches';
const KEEP = 1000;
const UPLOAD_BATCH = 100;

export type SyncState =
  | { readonly state: 'off' }
  | { readonly state: 'syncing' }
  | { readonly state: 'done'; readonly at: number }
  | { readonly state: 'error'; readonly error: string };

interface MatchState {
  readonly matches: readonly MatchRecord[];
  readonly sync: SyncState;
  addMatch(match: MatchRecord): void;
  /** Pull the account's races in and push this device's up. */
  syncNow(): Promise<void>;
}

const newestFirst = (ms: MatchRecord[]) => ms.sort((a, b) => b.at - a.at).slice(0, KEEP);

/** Per-viewer convenience; storage may be blocked, so every access is guarded. */
function load(): MatchRecord[] {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? newestFirst(raw.flatMap((m) => parseMatch(m) ?? [])) : [];
  } catch {
    return [];
  }
}

function save(matches: readonly MatchRecord[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(matches));
  } catch {
    // Not kept on this device this time; the account copy (if any) still is.
  }
}

const signedIn = () => supabase !== null && useAuthStore.getState().status === 'signedIn';

async function upload(matches: readonly MatchRecord[]): Promise<void> {
  if (!supabase) return;
  for (let i = 0; i < matches.length; i += UPLOAD_BATCH) {
    const { error } = await supabase.rpc('add_matches', {
      p_matches: matches.slice(i, i + UPLOAD_BATCH),
    });
    if (error) throw error;
  }
}

export const useMatchStore = create<MatchState>()((set, get) => ({
  matches: load(),
  sync: { state: 'off' },

  addMatch: (match) => {
    if (get().matches.some((m) => m.id === match.id)) return;
    const matches = newestFirst([match, ...get().matches]);
    set({ matches });
    save(matches);
    if (signedIn()) {
      upload([match]).catch((e: unknown) => set({ sync: { state: 'error', error: errorText(e) } }));
    }
  },

  syncNow: async () => {
    if (!supabase || !signedIn()) {
      set({ sync: { state: 'off' } });
      return;
    }
    set({ sync: { state: 'syncing' } });
    try {
      const { data, error } = await supabase.rpc('get_my_matches', { p_limit: KEEP });
      if (error) throw error;
      const remote = ((data as unknown[] | null) ?? []).flatMap((m) => parseMatch(m) ?? []);
      const remoteIds = new Set(remote.map((m) => m.id));
      const local = get().matches;
      // This device's races the account doesn't have yet (e.g. from before signing in).
      await upload(local.filter((m) => !remoteIds.has(m.id)));
      const localIds = new Set(local.map((m) => m.id));
      const matches = newestFirst([...local, ...remote.filter((m) => !localIds.has(m.id))]);
      set({ matches, sync: { state: 'done', at: Date.now() } });
      save(matches);
    } catch (e) {
      set({ sync: { state: 'error', error: errorText(e) } });
    }
  },
}));

// Catch up whenever someone signs in.
useAuthStore.subscribe((s, prev) => {
  if (s.status === 'signedIn' && prev.status !== 'signedIn') {
    void useMatchStore.getState().syncNow();
  }
});

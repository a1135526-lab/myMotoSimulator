import { create } from 'zustand';

const LIVERY_KEY = 'scooter-dyno:livery';

/** How your bike and rider look to you and to everyone you race. */
export interface Livery {
  /** Bodywork paint. */
  readonly body: string;
  readonly helmet: string;
  /** Leathers / jacket. */
  readonly jacket: string;
}

export const DEFAULT_LIVERY: Livery = { body: '#ff7a1a', helmet: '#ff7a1a', jacket: '#23262d' };

/** Ready-made colour schemes to start from. */
export const LIVERY_PRESETS: readonly (readonly [string, Livery])[] = [
  ['橘焰', DEFAULT_LIVERY],
  ['賽道藍', { body: '#1e5bd8', helmet: '#ffffff', jacket: '#1b2a4a' }],
  ['烈紅', { body: '#d61f2c', helmet: '#111111', jacket: '#2a1214' }],
  ['螢光綠', { body: '#5ee829', helmet: '#111111', jacket: '#1d2617' }],
  ['消光黑', { body: '#1b1d21', helmet: '#d4af37', jacket: '#101113' }],
  ['珍珠白', { body: '#f2f2ee', helmet: '#e53935', jacket: '#3a3d44' }],
  ['櫻花粉', { body: '#ff8fb8', helmet: '#ffffff', jacket: '#4a2a3a' }],
  ['黃蜂', { body: '#ffd400', helmet: '#111111', jacket: '#151515' }],
];

const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** A livery as stored or sent by another player, if it holds together. */
export function parseLivery(raw: unknown): Livery | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return isColor(o.body) && isColor(o.helmet) && isColor(o.jacket)
    ? { body: o.body, helmet: o.helmet, jacket: o.jacket }
    : null;
}

function load(): Livery {
  try {
    const raw = globalThis.localStorage?.getItem(LIVERY_KEY);
    return (raw && parseLivery(JSON.parse(raw))) || DEFAULT_LIVERY;
  } catch {
    return DEFAULT_LIVERY;
  }
}

interface LiveryState {
  readonly livery: Livery;
  setLivery(patch: Partial<Livery>): void;
}

export const useLiveryStore = create<LiveryState>()((set, get) => ({
  livery: load(),
  setLivery: (patch) => {
    const livery = parseLivery({ ...get().livery, ...patch });
    if (!livery) return;
    try {
      globalThis.localStorage?.setItem(LIVERY_KEY, JSON.stringify(livery));
    } catch {
      // Not persisted; it still applies for this visit.
    }
    set({ livery });
  },
}));

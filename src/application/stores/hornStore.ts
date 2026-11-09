import { create } from 'zustand';

const PRESET_KEY = 'scooter-dyno:horn';
const CLIP_KEY = 'scooter-dyno:horn-clip';

/** Built-in horn sounds, plus `custom`: the player's own recording. */
export const HORN_PRESETS = ['standard', 'beep', 'truck', 'tune', 'custom'] as const;
export type HornPreset = (typeof HORN_PRESETS)[number];

/** A few seconds of compressed audio as a data URL is well under this. */
export const HORN_CLIP_MAX_CHARS = 600_000;

const isClip = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith('data:audio/') && v.length <= HORN_CLIP_MAX_CHARS;

function load(): { preset: HornPreset; clip: string | null } {
  try {
    const clip = globalThis.localStorage?.getItem(CLIP_KEY) ?? null;
    const saved = globalThis.localStorage?.getItem(PRESET_KEY);
    const known = HORN_PRESETS.find((p) => p === saved) ?? 'standard';
    const okClip = isClip(clip) ? clip : null;
    // A custom horn without its recording falls back to the standard one.
    return { preset: known === 'custom' && !okClip ? 'standard' : known, clip: okClip };
  } catch {
    return { preset: 'standard', clip: null };
  }
}

function save(key: string, value: string | null): boolean {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

interface HornState {
  readonly preset: HornPreset;
  /** The player's recorded horn, as a data URL. */
  readonly clip: string | null;
  /** Horn button or H held right now. */
  readonly held: boolean;
  setHeld(held: boolean): void;
  setPreset(preset: HornPreset): void;
  /** Keep a recording (and switch to it); false if it couldn't be stored. */
  setClip(clip: string | null): boolean;
}

const initial = load();

export const useHornStore = create<HornState>()((set, get) => ({
  preset: initial.preset,
  clip: initial.clip,
  held: false,
  setHeld: (held) => {
    if (get().held !== held) set({ held });
  },
  setPreset: (preset) => {
    if (preset === 'custom' && !get().clip) return;
    save(PRESET_KEY, preset);
    set({ preset });
  },
  setClip: (clip) => {
    if (clip !== null && !isClip(clip)) return false;
    const stored = save(CLIP_KEY, clip);
    // A new recording is used straight away; deleting it goes back to standard.
    const current = get().preset;
    const preset: HornPreset = clip ? 'custom' : current === 'custom' ? 'standard' : current;
    save(PRESET_KEY, preset);
    set({ clip, preset });
    return stored;
  },
}));

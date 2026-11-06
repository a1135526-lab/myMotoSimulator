import { create } from 'zustand';
import type { GhostLap } from '@/domain';

const SOUND_KEY = 'scooter-dyno:sound';
const GHOST_KEY = 'scooter-dyno:ghost-on';
const MUSIC_KEY = 'scooter-dyno:music';

/** Lobby music: on unless turned off. */
function loadMusicOn(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUSIC_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveMusicOn(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(MUSIC_KEY, on ? 'on' : 'off');
  } catch {
    // Not persisted; the toggle still works for this session.
  }
}

/** Per-viewer convenience only; storage may be blocked, so every access is guarded. */
function loadSound(): boolean {
  try {
    return globalThis.localStorage?.getItem(SOUND_KEY) === 'on';
  } catch {
    return false;
  }
}

function saveSound(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Not persisted; the toggle still works for this session.
  }
}

/** Ghost bike on circuits: on unless turned off. */
function loadGhostOn(): boolean {
  try {
    return globalThis.localStorage?.getItem(GHOST_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveGhostOn(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(GHOST_KEY, on ? 'on' : 'off');
  } catch {
    // Not persisted; the toggle still works for this session.
  }
}

export type DynoView = 'engine' | 'chassis';
/** `home`: the lobby every visit starts in; `profile`: your race stats. */
export type AppMode = 'home' | 'profile' | 'simulator' | 'race' | 'street';

interface UiState {
  readonly mode: AppMode;
  /** Engine sound. Off by default: browsers need a click before audio can play. */
  readonly soundOn: boolean;
  setSoundOn(on: boolean): void;
  setMode(mode: AppMode): void;
  readonly dynoView: DynoView;
  /** Preset overlaid on the dyno as a third curve, if any. */
  readonly comparePresetId: string | null;
  setDynoView(view: DynoView): void;
  setComparePreset(id: string | null): void;
  /**
   * Steer by turning the phone: on by default on phones (useDefaultTilt);
   * iOS asks for permission again each visit, and only from a tap.
   */
  readonly tiltOn: boolean;
  setTiltOn(on: boolean): void;
  /**
   * Shift by flicking the phone forward (up) or back (down); on by default on
   * phones, with the same permission rules as tilt (useDefaultTilt).
   */
  readonly flickShiftOn: boolean;
  setFlickShiftOn(on: boolean): void;
  /** Music in the lobby, profile and friend rooms. */
  readonly musicOn: boolean;
  setMusicOn(on: boolean): void;
  /** Race your best lap's ghost on circuits. */
  readonly ghostOn: boolean;
  setGhostOn(on: boolean): void;
  /** Someone's lap from the global board to race on its circuit (this visit only). */
  readonly rivalGhost: { readonly circuitId: string; readonly ghost: GhostLap } | null;
  setRivalGhost(rival: { readonly circuitId: string; readonly ghost: GhostLap } | null): void;
}

export const useUiStore = create<UiState>()((set) => ({
  mode: 'home',
  soundOn: loadSound(),
  setSoundOn: (soundOn) => {
    saveSound(soundOn);
    set({ soundOn });
  },
  setMode: (mode) => set({ mode }),
  dynoView: 'chassis',
  comparePresetId: null,
  setDynoView: (dynoView) => set({ dynoView }),
  setComparePreset: (comparePresetId) => set({ comparePresetId }),
  tiltOn: false,
  setTiltOn: (tiltOn) => set({ tiltOn }),
  flickShiftOn: false,
  setFlickShiftOn: (flickShiftOn) => set({ flickShiftOn }),
  rivalGhost: null,
  setRivalGhost: (rivalGhost) => set({ rivalGhost }),
  musicOn: loadMusicOn(),
  setMusicOn: (musicOn) => {
    saveMusicOn(musicOn);
    set({ musicOn });
  },
  ghostOn: loadGhostOn(),
  setGhostOn: (ghostOn) => {
    saveGhostOn(ghostOn);
    set({ ghostOn });
  },
}));

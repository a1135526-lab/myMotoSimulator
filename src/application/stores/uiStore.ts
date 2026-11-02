import { create } from 'zustand';

const SOUND_KEY = 'scooter-dyno:sound';

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

export type DynoView = 'engine' | 'chassis';
export type AppMode = 'simulator' | 'race' | 'street';

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
   * Steer by turning the phone. Not remembered across visits: iOS asks for
   * permission again each time, and only from a tap.
   */
  readonly tiltOn: boolean;
  setTiltOn(on: boolean): void;
  /** Shift by flicking the phone forward (up) or back (down); same permission rules as tilt. */
  readonly flickShiftOn: boolean;
  setFlickShiftOn(on: boolean): void;
}

export const useUiStore = create<UiState>()((set) => ({
  mode: 'simulator',
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
}));

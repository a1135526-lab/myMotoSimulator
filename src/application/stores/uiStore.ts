import { create } from 'zustand';

export type DynoView = 'engine' | 'chassis';
export type AppMode = 'simulator' | 'race';

interface UiState {
  readonly mode: AppMode;
  setMode(mode: AppMode): void;
  readonly dynoView: DynoView;
  /** Preset overlaid on the dyno as a third curve, if any. */
  readonly comparePresetId: string | null;
  setDynoView(view: DynoView): void;
  setComparePreset(id: string | null): void;
}

export const useUiStore = create<UiState>()((set) => ({
  mode: 'simulator',
  setMode: (mode) => set({ mode }),
  dynoView: 'chassis',
  comparePresetId: null,
  setDynoView: (dynoView) => set({ dynoView }),
  setComparePreset: (comparePresetId) => set({ comparePresetId }),
}));

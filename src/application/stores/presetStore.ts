import { create } from 'zustand';
import {
  createPreset,
  defaultPresetRepository,
  type Preset,
  type PresetRepository,
} from '../services/presetService';
import type { TuneSelection } from '../tuning/selection';

export interface PresetState {
  readonly presets: readonly Preset[];
  save(name: string, bikeId: string, selection: TuneSelection): Preset;
  remove(id: string): void;
}

export const createPresetStore = (repository: PresetRepository) =>
  create<PresetState>()((set) => ({
    presets: repository.list(),
    save: (name, bikeId, selection) => {
      const preset = createPreset(name, bikeId, selection);
      repository.save(preset);
      set({ presets: repository.list() });
      return preset;
    },
    remove: (id) => {
      repository.remove(id);
      set({ presets: repository.list() });
    },
  }));

export const usePresetStore = createPresetStore(defaultPresetRepository());

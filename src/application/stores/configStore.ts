import { create } from 'zustand';
import { DEFAULT_BIKE_ID, getBike, STOCK_PART_ID } from '@/data';
import type { Preset } from '../services/presetService';
import {
  createStockSelection,
  type SelectableCategory,
  type TuneSelection,
} from '../tuning/selection';

export type ResettableGroup = SelectableCategory | 'rollers' | 'mass';

interface ConfigState {
  readonly bikeId: string;
  readonly selection: TuneSelection;
  readonly gradePercent: number;

  selectBike(bikeId: string): void;
  setPart(category: SelectableCategory, partId: string): void;
  setRoller(index: number, massG: number): void;
  setAllRollers(massG: number): void;
  setRiderMass(kg: number): void;
  setExtraMass(kg: number): void;
  setGrade(percent: number): void;
  reset(group: ResettableGroup): void;
  resetAll(): void;
  applyPreset(preset: Preset): void;
}

const stockOf = (bikeId: string) => createStockSelection(getBike(bikeId));

export const useConfigStore = create<ConfigState>()((set, get) => {
  const patch = (fn: (s: TuneSelection) => TuneSelection) =>
    set((state) => ({ selection: fn(state.selection) }));

  return {
    bikeId: DEFAULT_BIKE_ID,
    selection: stockOf(DEFAULT_BIKE_ID),
    gradePercent: 0,

    selectBike: (bikeId) => set({ bikeId, selection: stockOf(bikeId) }),

    setPart: (category, partId) =>
      patch((s) => ({ ...s, parts: { ...s.parts, [category]: partId } })),

    setRoller: (index, massG) =>
      patch((s) => ({
        ...s,
        rollerMassesG: s.rollerMassesG.map((m, i) => (i === index ? massG : m)),
      })),

    setAllRollers: (massG) =>
      patch((s) => ({ ...s, rollerMassesG: s.rollerMassesG.map(() => massG) })),

    setRiderMass: (kg) => patch((s) => ({ ...s, riderMassKg: kg })),
    setExtraMass: (kg) => patch((s) => ({ ...s, extraMassKg: kg })),
    setGrade: (percent) => set({ gradePercent: percent }),

    reset: (group) => {
      const stock = stockOf(get().bikeId);
      if (group === 'rollers') patch((s) => ({ ...s, rollerMassesG: stock.rollerMassesG }));
      else if (group === 'mass')
        patch((s) => ({ ...s, riderMassKg: stock.riderMassKg, extraMassKg: 0 }));
      else patch((s) => ({ ...s, parts: { ...s.parts, [group]: STOCK_PART_ID } }));
    },

    resetAll: () => set((state) => ({ selection: stockOf(state.bikeId), gradePercent: 0 })),

    applyPreset: (preset) => {
      const stock = stockOf(preset.bikeId);
      const rollersFit = preset.selection.rollerMassesG.length === stock.rollerMassesG.length;
      set({
        bikeId: preset.bikeId,
        selection: {
          ...preset.selection,
          parts: { ...stock.parts, ...preset.selection.parts },
          rollerMassesG: rollersFit ? preset.selection.rollerMassesG : stock.rollerMassesG,
        },
      });
    },
  };
});

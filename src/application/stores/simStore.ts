import { create } from 'zustand';
import type { SimSnapshot } from '../simulation/SimulationController';

/** Latest physics snapshot for rendering. Written ~60×/s by the controller. */
interface SimStoreState {
  readonly snapshot: SimSnapshot | null;
  publish(snapshot: SimSnapshot): void;
}

export const useSimStore = create<SimStoreState>()((set) => ({
  snapshot: null,
  publish: (snapshot) => set({ snapshot }),
}));

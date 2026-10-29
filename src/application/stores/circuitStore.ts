import { create } from 'zustand';
import type { CircuitView } from '../viewModels/circuit';

export type CameraMode = 'first' | 'third';

interface CircuitStoreState {
  /** Latest race frame for the HUD / 3D scene. Written every frame. */
  readonly view: CircuitView | null;
  readonly camera: CameraMode;
  publish(view: CircuitView): void;
  toggleCamera(): void;
  setCamera(mode: CameraMode): void;
}

export const useCircuitStore = create<CircuitStoreState>()((set) => ({
  view: null,
  camera: 'third',
  publish: (view) => set({ view }),
  toggleCamera: () => set((s) => ({ camera: s.camera === 'first' ? 'third' : 'first' })),
  setCamera: (camera) => set({ camera }),
}));

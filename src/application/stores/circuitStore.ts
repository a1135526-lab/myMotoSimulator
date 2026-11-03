import { create } from 'zustand';
import type { OnlineSubmission } from '../online/leaderboard';
import type { CircuitView } from '../viewModels/circuit';

export type CameraMode = 'first' | 'third';

/** Shown for a moment after each completed lap. */
export interface LapNotice {
  readonly lapS: number;
  /** Place on this circuit's board, or null (not top 10, or not clean). */
  readonly place: number | null;
  /** False after a crash or a reset: the lap isn't recorded. */
  readonly clean: boolean;
  /** A new best: the ghost is now this lap. */
  readonly best: boolean;
  /** Race clock when it was set, to fade it out. */
  readonly atS: number;
  /** The global board, for clean laps. */
  readonly online: OnlineSubmission;
}

interface CircuitStoreState {
  /** Latest race frame for the HUD / 3D scene. Written every frame. */
  readonly view: CircuitView | null;
  readonly camera: CameraMode;
  readonly lapNotice: LapNotice | null;
  publish(view: CircuitView): void;
  setLapNotice(notice: LapNotice | null): void;
  toggleCamera(): void;
  setCamera(mode: CameraMode): void;
}

export const useCircuitStore = create<CircuitStoreState>()((set) => ({
  view: null,
  camera: 'third',
  lapNotice: null,
  publish: (view) => set({ view }),
  setLapNotice: (lapNotice) => set({ lapNotice }),
  toggleCamera: () => set((s) => ({ camera: s.camera === 'first' ? 'third' : 'first' })),
  setCamera: (camera) => set({ camera }),
}));

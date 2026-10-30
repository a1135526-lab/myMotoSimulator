import { create } from 'zustand';
import type { StreetView } from '../viewModels/street';
import type { CameraMode } from './circuitStore';

export type TimeOfDay = 'day' | 'dusk' | 'night';
export type TrafficLevel = 'none' | 'light' | 'heavy';

export const TIME_OF_DAY_LABELS: Readonly<Record<TimeOfDay, string>> = {
  day: '白天',
  dusk: '黃昏',
  night: '夜晚',
};

export const TRAFFIC_LABELS: Readonly<Record<TrafficLevel, string>> = {
  none: '無',
  light: '少',
  heavy: '多',
};

export const TRAFFIC_CARS: Readonly<Record<TrafficLevel, number>> = {
  none: 0,
  light: 28,
  heavy: 70,
};

interface StreetStoreState {
  /** Choosing the bike and conditions, or out riding. */
  readonly stage: 'setup' | 'ride';
  readonly timeOfDay: TimeOfDay;
  readonly traffic: TrafficLevel;
  readonly autoShift: boolean;
  readonly autoClutch: boolean;
  readonly camera: CameraMode;
  /** Big map open (the ride is paused under it). */
  readonly mapOpen: boolean;
  /** Minimap fixed north-up, or turning with the bike. */
  readonly northUp: boolean;
  /** Latest frame for the HUD / 3D scene. Written every frame. */
  readonly view: StreetView | null;
  setStage(stage: 'setup' | 'ride'): void;
  setTimeOfDay(t: TimeOfDay): void;
  setTraffic(t: TrafficLevel): void;
  setAutoShift(on: boolean): void;
  setAutoClutch(on: boolean): void;
  toggleCamera(): void;
  setMapOpen(open: boolean): void;
  toggleNorthUp(): void;
  publish(view: StreetView): void;
}

export const useStreetStore = create<StreetStoreState>()((set) => ({
  stage: 'setup',
  timeOfDay: 'day',
  traffic: 'light',
  // Riding aids start off: the player opts in.
  autoShift: false,
  autoClutch: false,
  camera: 'third',
  mapOpen: false,
  northUp: false,
  view: null,
  setStage: (stage) => set({ stage, mapOpen: false, ...(stage === 'setup' && { view: null }) }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setTraffic: (traffic) => set({ traffic }),
  setAutoShift: (autoShift) => set({ autoShift }),
  setAutoClutch: (autoClutch) => set({ autoClutch }),
  toggleCamera: () => set((s) => ({ camera: s.camera === 'first' ? 'third' : 'first' })),
  setMapOpen: (mapOpen) => set({ mapOpen }),
  toggleNorthUp: () => set((s) => ({ northUp: !s.northUp })),
  publish: (view) => set({ view }),
}));

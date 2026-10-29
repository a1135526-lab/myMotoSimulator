import { create } from 'zustand';
import { clamp, MAX_RACE_DISTANCE_M, MIN_RACE_DISTANCE_M, type TreeMode } from '@/domain';
import { DEFAULT_BIKE_ID } from '@/data';
import { defaultOpponent, type OpponentSetup } from '../race/opponentSetup';
import type { RaceView } from '../viewModels/race';

export const DISTANCE_PRESETS_M = [201, 402, 1000] as const;

interface RaceStoreState {
  readonly distanceM: number;
  readonly treeMode: TreeMode;
  readonly opponent: OpponentSetup;
  /** Latest race frame for the HUD / 3D scene. Written every frame. */
  readonly view: RaceView | null;

  setDistance(m: number): void;
  setTreeMode(mode: TreeMode): void;
  setOpponent(patch: Partial<OpponentSetup>): void;
  publish(view: RaceView): void;
}

export const useRaceStore = create<RaceStoreState>()((set) => ({
  distanceM: 402,
  treeMode: 'sportsman',
  opponent: defaultOpponent(DEFAULT_BIKE_ID),
  view: null,

  setDistance: (m) =>
    set({ distanceM: Math.round(clamp(m, MIN_RACE_DISTANCE_M, MAX_RACE_DISTANCE_M)) }),
  setTreeMode: (treeMode) => set({ treeMode }),
  setOpponent: (patch) => set((s) => ({ opponent: { ...s.opponent, ...patch } })),
  publish: (view) => set({ view }),
}));

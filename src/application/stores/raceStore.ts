import { create } from 'zustand';
import { clamp, MAX_RACE_DISTANCE_M, MIN_RACE_DISTANCE_M, type TreeMode } from '@/domain';
import {
  DEFAULT_BIKE_ID,
  DEFAULT_CIRCUIT_ID,
  DEFAULT_TRACK_ID,
  getCircuit,
  getTrack,
  type TrackSpec,
} from '@/data';
import { defaultOpponent, type OpponentSetup } from '../race/opponentSetup';
import type { RaceView } from '../viewModels/race';

export const DISTANCE_PRESETS_M = [201, 402, 1000] as const;

/** Pre-race "garage" flow, then the race itself. */
export const RACE_STEPS = ['track', 'bike', 'tune', 'opponent', 'race'] as const;
export type RaceStep = (typeof RACE_STEPS)[number];

export const RACE_STEP_LABELS: Readonly<Record<RaceStep, string>> = {
  track: '賽道',
  bike: '機車',
  tune: '配備',
  opponent: '對手',
  race: '比賽',
};

/** Straight-line drag race, or laps of a road circuit. */
export type Discipline = 'drag' | 'circuit';

export const MAX_CIRCUIT_OPPONENTS = 3;
export const MAX_LAPS = 10;

interface RaceStoreState {
  readonly step: RaceStep;
  readonly discipline: Discipline;
  readonly circuitId: string;
  readonly laps: number;
  readonly opponentCount: number;
  /** Riding aids for circuits. */
  readonly assist: boolean;
  readonly brakeAssist: boolean;
  readonly autoShift: boolean;
  readonly trackId: string;
  /** Distance for the custom track; fixed tracks use their own. */
  readonly customDistanceM: number;
  readonly treeMode: TreeMode;
  readonly opponent: OpponentSetup;
  /** Latest race frame for the HUD / 3D scene. Written every frame. */
  readonly view: RaceView | null;

  setStep(step: RaceStep): void;
  setDiscipline(d: Discipline): void;
  setCircuit(id: string): void;
  setLaps(n: number): void;
  setOpponentCount(n: number): void;
  setAssist(on: boolean): void;
  setBrakeAssist(on: boolean): void;
  setAutoShift(on: boolean): void;
  setTrack(id: string): void;
  setCustomDistance(m: number): void;
  setTreeMode(mode: TreeMode): void;
  setOpponent(patch: Partial<OpponentSetup>): void;
  publish(view: RaceView): void;
}

export const useRaceStore = create<RaceStoreState>()((set) => ({
  step: 'track',
  discipline: 'drag',
  circuitId: DEFAULT_CIRCUIT_ID,
  laps: getCircuit(DEFAULT_CIRCUIT_ID).defaultLaps,
  opponentCount: 2,
  assist: true,
  brakeAssist: true,
  autoShift: true,
  trackId: DEFAULT_TRACK_ID,
  customDistanceM: 402,
  treeMode: 'sportsman',
  opponent: defaultOpponent(DEFAULT_BIKE_ID),
  view: null,

  setStep: (step) => set({ step, ...(step !== 'race' && { view: null }) }),
  setTrack: (trackId) => set({ trackId }),
  setDiscipline: (discipline) => set({ discipline }),
  setCircuit: (circuitId) => set({ circuitId, laps: getCircuit(circuitId).defaultLaps }),
  setLaps: (n) => set({ laps: Math.round(clamp(n, 1, MAX_LAPS)) }),
  setOpponentCount: (n) => set({ opponentCount: Math.round(clamp(n, 1, MAX_CIRCUIT_OPPONENTS)) }),
  setAssist: (assist) => set({ assist }),
  setBrakeAssist: (brakeAssist) => set({ brakeAssist }),
  setAutoShift: (autoShift) => set({ autoShift }),
  setCustomDistance: (m) =>
    set({ customDistanceM: Math.round(clamp(m, MIN_RACE_DISTANCE_M, MAX_RACE_DISTANCE_M)) }),
  setTreeMode: (treeMode) => set({ treeMode }),
  setOpponent: (patch) => set((s) => ({ opponent: { ...s.opponent, ...patch } })),
  publish: (view) => set({ view }),
}));

export interface ActiveTrack {
  readonly track: TrackSpec;
  readonly distanceM: number;
}

export const activeTrack = (trackId: string, customDistanceM: number): ActiveTrack => {
  const track = getTrack(trackId);
  return { track, distanceM: track.distanceM ?? customDistanceM };
};

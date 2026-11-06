import { create } from 'zustand';
import type { GhostLap, GhostSample } from '@/domain';

/**
 * Personal bests, kept on this device: lap leaderboards per circuit, best runs
 * per street mission, and the ghost of the best lap on each circuit.
 * (A shared online board would need a server; this is the local one.)
 */

export interface LapRecord {
  readonly lapS: number;
  /** "Brand Model". */
  readonly bike: string;
  readonly manual: boolean;
  /** Set with steering or braking assist on. */
  readonly assisted: boolean;
  /** When, ms since 1970. */
  readonly at: number;
}

export interface MissionRecord {
  readonly timeS: number;
  readonly stars: number;
  readonly bike: string;
  readonly crashes: number;
  readonly at: number;
}

export interface DragRecord {
  /** Elapsed time, stage beam to finish. */
  readonly etS: number;
  readonly trapKmh: number;
  readonly bike: string;
  readonly manual: boolean;
  readonly at: number;
}

export const LAP_BOARD_SIZE = 10;
export const DRAG_BOARD_SIZE = 10;
export const MISSION_BOARD_SIZE = 5;

interface RecordsState {
  readonly laps: Readonly<Record<string, readonly LapRecord[]>>;
  readonly missions: Readonly<Record<string, readonly MissionRecord[]>>;
  /** Per drag strip (and distance, for the custom strip). */
  readonly drag: Readonly<Record<string, readonly DragRecord[]>>;
  addDragRun(boardId: string, record: DragRecord): number | null;
  /** Adds a lap; its place on the board (1 = best), or null if it didn't make it. */
  addLap(circuitId: string, record: LapRecord): number | null;
  addMissionRun(missionId: string, record: MissionRecord): number | null;
}

const KEY = 'scooter-dyno:records';
const ghostKey = (circuitId: string) => `scooter-dyno:ghost:${circuitId}`;

/**
 * Circuits redrawn with gentler corners (layout 2): laps and ghosts set on
 * the old layout don't belong on the new one, so they're dropped once.
 */
const LAYOUT = 2;
const RELAID = [
  'practice-park',
  'hill-town',
  'harbor-night',
  'sugar-mill',
  'cloud-peak',
  'gorge-run',
  'lake-ridge',
  'kart-oval',
  'neon-streets',
  'rift-valley',
];

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function cleanLaps(raw: unknown): LapRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is LapRecord =>
        !!r &&
        isNum(r.lapS) &&
        r.lapS > 0 &&
        isStr(r.bike) &&
        typeof r.manual === 'boolean' &&
        typeof r.assisted === 'boolean' &&
        isNum(r.at),
    )
    .sort((a, b) => a.lapS - b.lapS)
    .slice(0, LAP_BOARD_SIZE);
}

function cleanMissionRuns(raw: unknown): MissionRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is MissionRecord =>
        !!r &&
        isNum(r.timeS) &&
        r.timeS > 0 &&
        isNum(r.stars) &&
        isStr(r.bike) &&
        isNum(r.crashes) &&
        isNum(r.at),
    )
    .sort((a, b) => a.timeS - b.timeS)
    .slice(0, MISSION_BOARD_SIZE);
}

function cleanDragRuns(raw: unknown): DragRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is DragRecord =>
        !!r &&
        isNum(r.etS) &&
        r.etS > 0 &&
        isNum(r.trapKmh) &&
        isStr(r.bike) &&
        typeof r.manual === 'boolean' &&
        isNum(r.at),
    )
    .sort((a, b) => a.etS - b.etS)
    .slice(0, DRAG_BOARD_SIZE);
}

function cleanBoards<T>(raw: unknown, clean: (v: unknown) => T[]): Record<string, T[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, T[]> = {};
  for (const [id, list] of Object.entries(raw)) {
    const kept = clean(list);
    if (kept.length) out[id] = kept;
  }
  return out;
}

/** Per-viewer convenience only; storage may be blocked, so every access is guarded. */
type Boards = Pick<RecordsState, 'laps' | 'missions' | 'drag'>;

function load(): Boards {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null') as {
      laps?: unknown;
      missions?: unknown;
      drag?: unknown;
      layout?: unknown;
    } | null;
    let laps = cleanBoards(raw?.laps, cleanLaps);
    if (raw && raw.layout !== LAYOUT) {
      laps = Object.fromEntries(Object.entries(laps).filter(([id]) => !RELAID.includes(id)));
      for (const id of RELAID) globalThis.localStorage?.removeItem(ghostKey(id));
    }
    return {
      laps,
      missions: cleanBoards(raw?.missions, cleanMissionRuns),
      drag: cleanBoards(raw?.drag, cleanDragRuns),
    };
  } catch {
    return { laps: {}, missions: {}, drag: {} };
  }
}

function save(state: Boards): void {
  try {
    globalThis.localStorage?.setItem(
      KEY,
      JSON.stringify({
        laps: state.laps,
        missions: state.missions,
        drag: state.drag,
        layout: LAYOUT,
      }),
    );
  } catch {
    // Not persisted; the records still show for this visit.
  }
}

/** Inserts in order and trims; returns the 1-based place, or null if it fell off. */
function insert<T>(list: readonly T[], item: T, key: (t: T) => number, size: number) {
  const next = [...list, item].sort((a, b) => key(a) - key(b)).slice(0, size);
  const place = next.indexOf(item);
  return { next, place: place < 0 ? null : place + 1 };
}

export const useRecordsStore = create<RecordsState>()((set, get) => ({
  ...load(),
  addLap: (circuitId, record) => {
    const { next, place } = insert(
      get().laps[circuitId] ?? [],
      record,
      (r) => r.lapS,
      LAP_BOARD_SIZE,
    );
    set({ laps: { ...get().laps, [circuitId]: next } });
    save(get());
    return place;
  },
  addDragRun: (boardId, record) => {
    const { next, place } = insert(
      get().drag[boardId] ?? [],
      record,
      (r) => r.etS,
      DRAG_BOARD_SIZE,
    );
    set({ drag: { ...get().drag, [boardId]: next } });
    save(get());
    return place;
  },
  addMissionRun: (missionId, record) => {
    const { next, place } = insert(
      get().missions[missionId] ?? [],
      record,
      (r) => r.timeS,
      MISSION_BOARD_SIZE,
    );
    set({ missions: { ...get().missions, [missionId]: next } });
    save(get());
    return place;
  },
}));

// ---- Ghosts: one per circuit, stored apart (each is a few tens of kB) ----

/** Samples flattened as [t, x, z, heading, lean, …], rounded: about 25 kB a lap. */
interface StoredGhost {
  readonly lapS: number;
  readonly bike: string;
  readonly manual: boolean;
  readonly s: readonly number[];
}

const FIELDS = 5;
const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

export function loadGhost(circuitId: string): GhostLap | null {
  try {
    const raw = JSON.parse(
      globalThis.localStorage?.getItem(ghostKey(circuitId)) ?? 'null',
    ) as Partial<StoredGhost> | null;
    if (!raw || !isNum(raw.lapS) || !isStr(raw.bike) || !Array.isArray(raw.s)) return null;
    const flat = raw.s;
    if (flat.length < FIELDS * 2 || flat.length % FIELDS !== 0 || !flat.every(isNum)) return null;
    const samples: GhostSample[] = [];
    for (let i = 0; i < flat.length; i += FIELDS) {
      const [t, x, z, heading, lean] = flat.slice(i, i + FIELDS) as number[];
      samples.push({ t: t ?? 0, x: x ?? 0, z: z ?? 0, heading: heading ?? 0, lean: lean ?? 0 });
    }
    return { lapS: raw.lapS, bike: raw.bike, manual: raw.manual === true, samples };
  } catch {
    return null;
  }
}

export function saveGhost(circuitId: string, ghost: GhostLap): void {
  const s = ghost.samples.flatMap((p) => [
    round(p.t, 3),
    round(p.x, 2),
    round(p.z, 2),
    round(p.heading, 3),
    round(p.lean, 3),
  ]);
  const stored: StoredGhost = { lapS: ghost.lapS, bike: ghost.bike, manual: ghost.manual, s };
  try {
    globalThis.localStorage?.setItem(ghostKey(circuitId), JSON.stringify(stored));
  } catch {
    // Storage full or blocked: the ghost lives until the page closes.
  }
}

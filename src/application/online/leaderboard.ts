import type { GhostLap, GhostSample } from '@/domain';
import { useAuthStore } from './authStore';
import { errorText, supabase } from './supabase';

/**
 * The global leaderboards: send a score, read a board, fetch someone's ghost.
 * Every call needs the server; failures come back as player-facing text.
 */

export interface LapBoardRow {
  readonly rank: number;
  readonly nickname: string;
  readonly lapS: number;
  readonly bike: string;
  readonly manual: boolean;
  readonly at: number;
  readonly isMe: boolean;
}

export interface DragBoardRow {
  readonly rank: number;
  readonly nickname: string;
  readonly etS: number;
  readonly trapKmh: number;
  readonly bike: string;
  readonly manual: boolean;
  readonly at: number;
  readonly isMe: boolean;
}

export interface MissionBoardRow {
  readonly rank: number;
  readonly nickname: string;
  readonly timeS: number;
  readonly stars: number;
  readonly crashes: number;
  readonly bike: string;
  readonly at: number;
  readonly isMe: boolean;
}

/** Where a score landed: its place on that board, and whether it beat your best there. */
export interface SubmitResult {
  readonly rank: number;
  readonly improved: boolean;
}

export type Outcome<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

/** How sending one score to the global board went. */
export type OnlineSubmission =
  /** Not signed in (or no server): stays on this device only. */
  | { readonly state: 'off' }
  | { readonly state: 'sending' }
  | { readonly state: 'done'; readonly rank: number; readonly improved: boolean }
  | { readonly state: 'error'; readonly error: string };

/**
 * Sends a score if the player can, reporting progress through `update`:
 * 'off' straight away when not signed in, else 'sending' then the outcome.
 */
export function sendScore(
  send: () => Promise<Outcome<SubmitResult>>,
  update: (submission: OnlineSubmission) => void,
): void {
  if (!canSubmit()) {
    update({ state: 'off' });
    return;
  }
  update({ state: 'sending' });
  void send().then((res) =>
    update(
      res.ok
        ? { state: 'done', rank: Number(res.value.rank), improved: res.value.improved }
        : { state: 'error', error: res.error },
    ),
  );
}

/** Signed in with a nickname: scores can go to the global boards. */
export const canSubmit = () => {
  const { status, nickname } = useAuthStore.getState();
  return supabase !== null && status === 'signedIn' && nickname !== null;
};

const BOARD_SIZE = 50;
/** Uploaded ghosts keep a sample every 0.2 s (half the on-device rate) to stay small. */
const UPLOAD_EVERY = 2;
const FIELDS = 5;
const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

/** Samples flattened as [t, x, z, heading, lean, …], every other one, always ending on the finish. */
export function encodeGhost(samples: readonly GhostSample[]): number[] {
  const kept = samples.filter((_, i) => i % UPLOAD_EVERY === 0);
  const last = samples[samples.length - 1];
  if (last && kept[kept.length - 1] !== last) kept.push(last);
  return kept.flatMap((p) => [
    round(p.t, 3),
    round(p.x, 2),
    round(p.z, 2),
    round(p.heading, 3),
    round(p.lean, 3),
  ]);
}

export function decodeGhost(flat: unknown): GhostSample[] | null {
  if (!Array.isArray(flat) || flat.length < FIELDS * 2 || flat.length % FIELDS !== 0) return null;
  if (!flat.every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  const nums = flat as number[];
  const samples: GhostSample[] = [];
  for (let i = 0; i < nums.length; i += FIELDS) {
    samples.push({
      t: nums[i] ?? 0,
      x: nums[i + 1] ?? 0,
      z: nums[i + 2] ?? 0,
      heading: nums[i + 3] ?? 0,
      lean: nums[i + 4] ?? 0,
    });
  }
  return samples;
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<Outcome<T>> {
  if (!supabase) return { ok: false, error: '目前沒有連線到排行榜' };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { ok: false, error: errorText(error) };
    return { ok: true, value: data as T };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

const ms = (s: number) => Math.round(s * 1000);
const time = (iso: unknown) => (typeof iso === 'string' ? Date.parse(iso) : 0);

// ---- Sending ----

export function submitLap(lap: {
  circuitId: string;
  assisted: boolean;
  lapS: number;
  bike: string;
  manual: boolean;
  samples: readonly GhostSample[];
}) {
  return call<SubmitResult>('submit_lap', {
    p_circuit: lap.circuitId,
    p_assisted: lap.assisted,
    p_lap_ms: ms(lap.lapS),
    p_bike: lap.bike,
    p_manual: lap.manual,
    p_ghost: encodeGhost(lap.samples),
  });
}

export function submitDrag(run: {
  trackId: string;
  etS: number;
  trapKmh: number;
  bike: string;
  manual: boolean;
}) {
  return call<SubmitResult>('submit_drag', {
    p_track: run.trackId,
    p_et_ms: ms(run.etS),
    p_trap_kmh: run.trapKmh,
    p_bike: run.bike,
    p_manual: run.manual,
  });
}

export function submitMission(run: {
  missionId: string;
  timeS: number;
  crashes: number;
  bike: string;
}) {
  return call<SubmitResult>('submit_mission', {
    p_mission: run.missionId,
    p_time_ms: ms(run.timeS),
    p_crashes: run.crashes,
    p_bike: run.bike,
  });
}

// ---- Reading ----

interface RawRow {
  rank: number;
  nickname: string;
  bike: string;
  set_at: string;
  is_me: boolean;
}

const base = (r: RawRow) => ({
  rank: Number(r.rank),
  nickname: r.nickname,
  bike: r.bike,
  at: time(r.set_at),
  isMe: r.is_me === true,
});

export async function fetchLapBoard(
  circuitId: string,
  assisted: boolean,
): Promise<Outcome<LapBoardRow[]>> {
  const res = await call<(RawRow & { lap_ms: number; manual: boolean })[]>('get_lap_board', {
    p_circuit: circuitId,
    p_assisted: assisted,
    p_limit: BOARD_SIZE,
  });
  if (!res.ok) return res;
  return {
    ok: true,
    value: (res.value ?? []).map((r) => ({ ...base(r), lapS: r.lap_ms / 1000, manual: r.manual })),
  };
}

export async function fetchDragBoard(trackId: string): Promise<Outcome<DragBoardRow[]>> {
  const res = await call<(RawRow & { et_ms: number; trap_kmh: number; manual: boolean })[]>(
    'get_drag_board',
    { p_track: trackId, p_limit: BOARD_SIZE },
  );
  if (!res.ok) return res;
  return {
    ok: true,
    value: (res.value ?? []).map((r) => ({
      ...base(r),
      etS: r.et_ms / 1000,
      trapKmh: r.trap_kmh,
      manual: r.manual,
    })),
  };
}

export async function fetchMissionBoard(missionId: string): Promise<Outcome<MissionBoardRow[]>> {
  const res = await call<(RawRow & { time_ms: number; stars: number; crashes: number })[]>(
    'get_mission_board',
    { p_mission: missionId, p_limit: BOARD_SIZE },
  );
  if (!res.ok) return res;
  return {
    ok: true,
    value: (res.value ?? []).map((r) => ({
      ...base(r),
      timeS: r.time_ms / 1000,
      stars: r.stars,
      crashes: r.crashes,
    })),
  };
}

/** Someone's best lap to race against. */
export async function fetchLapGhost(
  circuitId: string,
  assisted: boolean,
  nickname: string,
): Promise<Outcome<GhostLap & { readonly owner: string }>> {
  const res = await call<{ lap_ms: number; bike: string; manual: boolean; ghost: unknown }[]>(
    'get_lap_ghost',
    { p_circuit: circuitId, p_assisted: assisted, p_nickname: nickname },
  );
  if (!res.ok) return res;
  const row = res.value?.[0];
  const samples = row ? decodeGhost(row.ghost) : null;
  if (!row || !samples) return { ok: false, error: '找不到這位玩家的幽靈車' };
  return {
    ok: true,
    value: {
      lapS: row.lap_ms / 1000,
      bike: row.bike,
      manual: row.manual,
      samples,
      owner: nickname,
    },
  };
}

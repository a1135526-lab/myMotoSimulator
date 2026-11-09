import { create } from 'zustand';
import { useLiveryStore } from '../../stores/liveryStore';
import { useUiStore } from '../../stores/uiStore';
import { RemoteRiders } from './remoteRiders';
import { liveTransport, passOn, SupabaseRoomTransport, type RoomTransport } from './roomTransport';
import {
  MAX_ROOM_PLAYERS,
  NAME_MAX,
  newRoomCode,
  normalizeRoomCode,
  type PosePayload,
  type RoomMessage,
  type RoomPlayer,
  type RoomSettings,
} from './roomTypes';

export type RoomStatus = 'idle' | 'connecting' | 'lobby' | 'racing';

/** The hold after the fifth red light, s: random, but the same for everyone. */
const HOLD_RANGE_S: readonly [number, number] = [0.4, 2.5];
/** How long to wait for the room's players to show up when joining, ms. */
const JOIN_WAIT_MS = 4000;

export interface RoomFinish {
  readonly timeS: number;
  readonly bestLapS: number | null;
}

/** You, minus when you joined (that's set on entering a room). */
export type RoomProfile = Omit<RoomPlayer, 'id' | 'joinedAt'>;

interface RoomState {
  readonly status: RoomStatus;
  readonly code: string | null;
  readonly me: RoomPlayer | null;
  /** In joining order (the first is the host), at most four. */
  readonly players: readonly RoomPlayer[];
  readonly settings: RoomSettings;
  /** The race under way: everyone's lights hold, and an id to drop stale messages. */
  readonly race: { readonly raceId: number; readonly holdS: number } | null;
  /** A race is on and you joined after it started: you'll be in the next one. */
  readonly waitingForNext: boolean;
  readonly finishes: Readonly<Record<string, RoomFinish>>;
  /** Who wants another race, after this one (player ids). */
  readonly again: readonly string[];
  readonly error: string | null;
  /** A new room; `code` to use a given one (a ranked match the matchmaker named). */
  create(profile: RoomProfile, settings: RoomSettings, code?: string): Promise<void>;
  join(code: string, profile: RoomProfile): Promise<void>;
  leave(): void;
  /** Your bike changed: tell the room. */
  updateProfile(profile: RoomProfile): void;
  /** Host only. */
  setSettings(settings: RoomSettings): void;
  /** Host only: lights on for everyone. */
  startRace(): void;
  /** Host only: race over, everyone back to the lobby. */
  backToLobby(): void;
  sendPose(pose: PosePayload): void;
  sendFinish(timeS: number, bestLapS: number | null): void;
  /** At the results: you'd race again (the host sees who's in). */
  wantAgain(): void;
}

/** Other players' bikes in the current race (kept outside React: updated ~10×/s each). */
export const remoteRiders = new RemoteRiders();

let transport: RoomTransport | null = null;
let makeTransport = (): RoomTransport | null => new SupabaseRoomTransport();
let random = Math.random;
let now = () => Date.now();

/** Tests: a fake connection, and fixed randomness / clock. */
export function setRoomDeps(deps: {
  transport?: () => RoomTransport | null;
  random?: () => number;
  now?: () => number;
}): void {
  if (deps.transport) makeTransport = deps.transport;
  if (deps.random) random = deps.random;
  if (deps.now) now = deps.now;
}

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);

const isHost = (s: Pick<RoomState, 'me' | 'players'>) =>
  s.me !== null && s.players[0]?.id === s.me.id;

const IDLE = {
  status: 'idle' as const,
  code: null,
  me: null,
  players: [],
  race: null,
  waitingForNext: false,
  finishes: {},
  again: [],
};

export const useRoomStore = create<RoomState>()((set, get) => {
  let presenceSeen: ((players: RoomPlayer[]) => void) | null = null;

  const handlers = {
    presence(all: RoomPlayer[]) {
      const players = [...all].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
      const before = get().players;
      set({ players: players.slice(0, MAX_ROOM_PLAYERS) });
      presenceSeen?.(players);
      // The host tells newcomers what's set (and if a race is on).
      const s = get();
      if (isHost(s) && players.some((p) => !before.some((b) => b.id === p.id))) {
        transport?.send({ type: 'settings', settings: s.settings, racing: s.status === 'racing' });
      }
    },
    message(msg: RoomMessage) {
      passOn(msg);
      const s = get();
      switch (msg.type) {
        case 'settings':
          set({
            settings: msg.settings,
            waitingForNext: msg.racing && s.status === 'lobby',
          });
          return;
        case 'start':
          applyStart(msg.raceId, msg.settings, msg.holdS);
          return;
        case 'pose':
          if (s.race?.raceId === msg.raceId) remoteRiders.push(msg.id, performance.now(), msg.pose);
          return;
        case 'finish':
          if (s.race?.raceId === msg.raceId) {
            set({
              finishes: { ...s.finishes, [msg.id]: { timeS: msg.timeS, bestLapS: msg.bestLapS } },
            });
          }
          return;
        case 'again':
          if (s.race?.raceId === msg.raceId && !s.again.includes(msg.id)) {
            set({ again: [...s.again, msg.id] });
          }
          return;
        case 'lobby':
          set({ status: 'lobby', race: null, waitingForNext: false });
          return;
      }
    },
  };

  const applyStart = (raceId: number, settings: RoomSettings, holdS: number) => {
    remoteRiders.clear();
    set({
      status: 'racing',
      settings,
      race: { raceId, holdS },
      waitingForNext: false,
      finishes: {},
      again: [],
    });
  };

  /** Into the room; resolves with everyone there once presence has arrived. */
  const enter = async (code: string, profile: RoomProfile) => {
    transport?.leave();
    transport = liveTransport(makeTransport());
    if (!transport) {
      set({ ...IDLE, error: '這個版本沒有連線功能，無法使用好友房間' });
      return null;
    }
    const me: RoomPlayer = {
      ...profile,
      name: cleanName(profile.name),
      id: globalThis.crypto?.randomUUID?.() ?? `p${now()}${Math.floor(random() * 1e9)}`,
      joinedAt: now(),
      livery: useLiveryStore.getState().livery,
    };
    set({ ...IDLE, status: 'connecting', code, me, error: null });
    const seen = new Promise<RoomPlayer[]>((resolve) => {
      const timer = setTimeout(() => resolve(get().players.slice()), JOIN_WAIT_MS);
      presenceSeen = (players) => {
        // Wait until we see someone else (or time runs out).
        if (players.some((p) => p.id !== me.id)) {
          clearTimeout(timer);
          resolve(players);
        }
      };
    });
    const ok = await transport.connect(code, me, handlers);
    if (!ok) {
      get().leave();
      set({ error: '連不上伺服器，請檢查網路後再試一次' });
      return null;
    }
    return { me, seen };
  };

  return {
    ...IDLE,
    settings: { circuitId: 'practice-park', laps: 3 },
    error: null,

    create: async (profile, settings, code) => {
      const entered = await enter(code ?? newRoomCode(random), profile);
      if (!entered) return;
      presenceSeen = null;
      set({ status: 'lobby', settings });
    },

    join: async (input, profile) => {
      const code = normalizeRoomCode(input);
      if (!code) {
        set({ error: '房號是 5 個英文字母或數字' });
        return;
      }
      const entered = await enter(code, profile);
      if (!entered) return;
      const players = await entered.seen;
      presenceSeen = null;
      if (!players.some((p) => p.id !== entered.me.id)) {
        get().leave();
        set({ error: `找不到房間 ${code}，請確認房號，或請朋友先建立房間` });
        return;
      }
      const rank = players.findIndex((p) => p.id === entered.me.id);
      if (rank >= MAX_ROOM_PLAYERS) {
        get().leave();
        set({ error: `房間 ${code} 已經滿了（最多 ${MAX_ROOM_PLAYERS} 人）` });
        return;
      }
      if (get().status === 'connecting') set({ status: 'lobby' });
    },

    leave: () => {
      transport?.leave();
      transport = liveTransport(null);
      presenceSeen = null;
      remoteRiders.clear();
      set({ ...IDLE });
    },

    updateProfile: (profile) => {
      const me = get().me;
      if (!me) return;
      const next = { ...me, ...profile, name: cleanName(profile.name) };
      set({ me: next });
      transport?.announce(next);
    },

    setSettings: (settings) => {
      if (!isHost(get())) return;
      set({ settings });
      transport?.send({ type: 'settings', settings, racing: get().status === 'racing' });
    },

    startRace: () => {
      const s = get();
      if (!isHost(s)) return;
      const [lo, hi] = HOLD_RANGE_S;
      const raceId = now();
      const holdS = lo + random() * (hi - lo);
      transport?.send({ type: 'start', raceId, settings: s.settings, holdS });
      applyStart(raceId, s.settings, holdS);
    },

    backToLobby: () => {
      if (!isHost(get())) return;
      transport?.send({ type: 'lobby' });
      set({ status: 'lobby', race: null, waitingForNext: false });
    },

    sendPose: (pose) => {
      const { me, race } = get();
      if (me && race) transport?.send({ type: 'pose', id: me.id, raceId: race.raceId, pose });
    },

    sendFinish: (timeS, bestLapS) => {
      const { me, race, finishes } = get();
      if (!me || !race || finishes[me.id]) return;
      set({ finishes: { ...finishes, [me.id]: { timeS, bestLapS } } });
      transport?.send({ type: 'finish', id: me.id, raceId: race.raceId, timeS, bestLapS });
    },

    wantAgain: () => {
      const { me, race, again } = get();
      if (!me || !race || again.includes(me.id)) return;
      set({ again: [...again, me.id] });
      transport?.send({ type: 'again', id: me.id, raceId: race.raceId });
    },
  };
});

export const amHost = () => isHost(useRoomStore.getState());

// Leaving race mode (for the lobby, the simulator…) leaves the room too.
useUiStore.subscribe((s, prev) => {
  if (prev.mode === 'race' && s.mode !== 'race' && useRoomStore.getState().status !== 'idle') {
    useRoomStore.getState().leave();
  }
});

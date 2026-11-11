import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import {
  ladderOf,
  RANKED_LADDERS,
  RANKED_LAPS,
  tierOf,
  type RankedGroup,
  type RankedLadder,
} from '@/domain';
import { newMatchId } from '../../stats/matchTypes';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../authStore';
import { useRoomStore } from '../room/roomStore';
import { newRoomCode } from '../room/roomTypes';
import { errorText, supabase } from '../supabase';
import { formMatch, matchFor, QUEUE_GIVE_UP_S, queuedFrom, type QueuedPlayer } from './matchmaking';
import {
  randomCircuit,
  rankedProfile,
  type RankedMatch,
  type RankedPhase,
  type RankedRecord,
  type RankedResult,
} from './rankedTypes';

/**
 * Ranked racing: queue for your group, get matched with people of a similar
 * rank (or the AI after a while), race, and report your place for points.
 */

interface RankedState {
  readonly phase: RankedPhase;
  readonly group: RankedGroup;
  /** Queued for item ranked (its own ladder). */
  readonly items: boolean;
  readonly queuedAt: number | null;
  /** Others in the queue for your group right now. */
  readonly inQueue: number;
  readonly match: RankedMatch | null;
  readonly mine: Partial<Record<RankedLadder, RankedRecord>>;
  readonly result: RankedResult | null;
  readonly error: string | null;
  loadMine(): Promise<void>;
  queue(group: RankedGroup, name: string, items?: boolean): Promise<void>;
  /** Out of the queue / match, back to the ranked menu. */
  cancel(): void;
  /** Your place in the race just finished. */
  report(position: number, field: number): Promise<void>;
}

/** Guests give the host a moment to open the room. */
const GUEST_DELAY_MS = 1500;
/** The host starts once everyone is in, or after this long with whoever is. */
const ROOM_START_WAIT_MS = 12_000;
/** A guest whose race hasn't started by now gives up and races the AI. */
const GUEST_GIVE_UP_MS = 25_000;
const TICK_MS = 1000;

let channel: RealtimeChannel | null = null;
let queueTimer: number | null = null;
let roomTimer: number | null = null;
let unwatchRoom: (() => void) | null = null;

function clearTimers(): void {
  if (queueTimer !== null) window.clearTimeout(queueTimer);
  if (roomTimer !== null) window.clearTimeout(roomTimer);
  unwatchRoom?.();
  queueTimer = roomTimer = null;
  unwatchRoom = null;
}

function leaveQueue(): void {
  if (channel) void supabase?.removeChannel(channel);
  channel = null;
}

export const useRankedStore = create<RankedState>()((set, get) => {
  const raceAi = () => {
    clearTimers();
    leaveQueue();
    if (useRoomStore.getState().status !== 'idle') useRoomStore.getState().leave();
    const { group, items } = get();
    set({
      phase: 'ai',
      result: null,
      match: {
        id: newMatchId(),
        kind: 'ai',
        group,
        circuitId: randomCircuit(items),
        laps: RANKED_LAPS,
        size: 1,
        aiTier: tierOf(get().mine[ladderOf(group, items)]?.points ?? 0).index,
        ...(items && { items }),
      },
    });
  };

  /** Matched: into the room (opening it if you lead), then racing once it fills. */
  const enterMatch = async (match: RankedMatch, code: string, host: boolean, name: string) => {
    clearTimers();
    leaveQueue();
    set({ phase: 'joining', match, result: null });
    const profile = rankedProfile(match.group, name);
    const settings = {
      circuitId: match.circuitId,
      laps: match.laps,
      ranked: match.group,
      ...(match.items && { items: true as const }),
    };
    const room = useRoomStore.getState();
    if (host) {
      await room.create(profile, settings, code);
    } else {
      await new Promise((r) => setTimeout(r, GUEST_DELAY_MS));
      await room.join(code, profile);
      if (useRoomStore.getState().status === 'idle') {
        await new Promise((r) => setTimeout(r, GUEST_DELAY_MS));
        await useRoomStore.getState().join(code, profile);
      }
    }
    if (get().phase !== 'joining') return;
    if (useRoomStore.getState().status === 'idle') return raceAi();
    set({ phase: 'room' });
    if (host) {
      const startWhenFull = () => {
        const r = useRoomStore.getState();
        if (r.status === 'lobby' && r.players.length >= match.size) r.startRace();
      };
      unwatchRoom = useRoomStore.subscribe(startWhenFull);
      startWhenFull();
      roomTimer = window.setTimeout(() => {
        const r = useRoomStore.getState();
        if (r.status !== 'lobby') return;
        if (r.players.length >= 2) r.startRace();
        else raceAi();
      }, ROOM_START_WAIT_MS);
    } else {
      roomTimer = window.setTimeout(() => {
        if (useRoomStore.getState().status === 'lobby') raceAi();
      }, GUEST_GIVE_UP_MS);
    }
  };

  return {
    phase: 'idle',
    group: 'scooter',
    items: false,
    queuedAt: null,
    inQueue: 0,
    match: null,
    mine: {},
    result: null,
    error: null,

    loadMine: async () => {
      if (!supabase) return;
      const { data, error } = await supabase.rpc('get_my_ranked');
      if (error) {
        set({ error: errorText(error) });
        return;
      }
      const mine: Partial<Record<RankedLadder, RankedRecord>> = {};
      for (const r of (data as (RankedRecord & { grp: string })[]) ?? []) {
        const ladder = RANKED_LADDERS.find((l) => l === r.grp);
        if (ladder) mine[ladder] = { points: r.points, games: r.games, wins: r.wins, best: r.best };
      }
      set({ mine, error: null });
    },

    queue: async (group, name, items = false) => {
      const client = supabase;
      const { userId } = useAuthStore.getState();
      if (!client || !userId) return;
      get().cancel();
      const ladder = ladderOf(group, items);
      const points = get().mine[ladder]?.points ?? 0;
      const me: QueuedPlayer = { id: userId, points, joinedAt: Date.now() };
      set({
        phase: 'queue',
        group,
        items,
        queuedAt: me.joinedAt,
        inQueue: 0,
        error: null,
        result: null,
      });
      const ch = client.channel(`mm:${ladder}`, {
        config: { broadcast: { self: false }, presence: { key: userId } },
      });
      channel = ch;
      let queueList: QueuedPlayer[] = [me];

      ch.on('presence', { event: 'sync' }, () => {
        queueList = queuedFrom(ch.presenceState());
        set({ inQueue: Math.max(0, queueList.length - 1) });
      });
      ch.on('broadcast', { event: 'match' }, ({ payload }) => {
        const m = matchFor(payload, userId);
        if (!m || get().phase !== 'queue') return;
        const match: RankedMatch = {
          id: m.matchId,
          kind: 'room',
          group,
          circuitId: m.circuitId,
          laps: RANKED_LAPS,
          size: m.size,
          ...(items && { items }),
        };
        void enterMatch(match, m.code, false, name);
      });
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') void ch.track(me);
      });

      // Each second: if you've waited longest, try to form a race; give up on people after a while.
      const tick = () => {
        if (get().phase !== 'queue') return;
        const now = Date.now();
        const members = formMatch(queueList, now);
        if (members && members[0]?.id === userId) {
          const match: RankedMatch = {
            id: newMatchId(),
            kind: 'room',
            group,
            circuitId: randomCircuit(items),
            laps: RANKED_LAPS,
            size: members.length,
            ...(items && { items }),
          };
          const code = newRoomCode();
          void ch.send({
            type: 'broadcast',
            event: 'match',
            payload: {
              matchId: match.id,
              code,
              circuitId: match.circuitId,
              members: members.map((p) => p.id),
            },
          });
          void enterMatch(match, code, true, name);
          return;
        }
        if (now - me.joinedAt >= QUEUE_GIVE_UP_S * 1000) return raceAi();
        queueTimer = window.setTimeout(tick, TICK_MS);
      };
      queueTimer = window.setTimeout(tick, TICK_MS);
    },

    cancel: () => {
      clearTimers();
      leaveQueue();
      if (useRoomStore.getState().status !== 'idle') useRoomStore.getState().leave();
      set({ phase: 'idle', queuedAt: null, inQueue: 0, match: null });
    },

    report: async (position, field) => {
      const { match } = get();
      if (!supabase || !match) return;
      const vsAi = match.kind === 'ai';
      const ladder = ladderOf(match.group, match.items === true);
      const before = get().mine[ladder]?.points ?? 0;
      set({ result: { state: 'sending' } });
      const { data, error } = await supabase.rpc('report_ranked', {
        p_match: match.id,
        p_group: ladder,
        p_vs_ai: vsAi,
        p_position: Math.min(position, field),
        p_field: Math.min(4, Math.max(2, field)),
      });
      if (error) {
        set({ result: { state: 'error', error: errorText(error) } });
        return;
      }
      const r = data as { points: number; delta: number; games: number; wins: number };
      const prev = get().mine[ladder];
      set({
        result: { state: 'done', before, points: r.points, delta: r.delta, vsAi },
        mine: {
          ...get().mine,
          [ladder]: {
            points: r.points,
            games: r.games,
            wins: r.wins,
            best: Math.max(prev?.best ?? 0, r.points),
          },
        },
      });
    },
  };
});

// Leaving race mode (for the lobby…) leaves the queue or match too.
useUiStore.subscribe((s, prev) => {
  if (prev.mode === 'race' && s.mode !== 'race' && useRankedStore.getState().phase !== 'idle') {
    useRankedStore.getState().cancel();
  }
});

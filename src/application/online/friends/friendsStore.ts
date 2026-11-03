import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';
import { parseMatch, type MatchRecord } from '../../stats/matchTypes';
import { useAuthStore } from '../authStore';
import type { Outcome } from '../leaderboard';
import { normalizeRoomCode } from '../room/roomTypes';
import { errorText, supabase } from '../supabase';

/**
 * Friends: requests by nickname, who's online, and room invites. Needs a
 * signed-in player with a nickname; everything here goes through the RPCs in
 * supabase/003_friends.sql plus two Realtime channels — a shared presence
 * list of who's online, and each player's own inbox for invites.
 */

export type FriendState = 'friend' | 'incoming' | 'outgoing';

export interface Friend {
  readonly id: string;
  readonly nickname: string;
  readonly state: FriendState;
}

export interface RoomInvite {
  readonly fromId: string;
  readonly from: string;
  readonly code: string;
  readonly at: number;
}

interface FriendsState {
  readonly friends: readonly Friend[];
  readonly loading: boolean;
  readonly error: string | null;
  /** Account ids of everyone signed in with the game open right now. */
  readonly online: ReadonlySet<string>;
  /** Invites to friends' rooms, newest last. */
  readonly invites: readonly RoomInvite[];
  refresh(): Promise<void>;
  /** A request by nickname; resolves with what happened, in words. */
  add(nickname: string): Promise<{ ok: boolean; message: string }>;
  respond(friendId: string, accept: boolean): Promise<void>;
  remove(friendId: string): Promise<void>;
  friendMatches(friendId: string): Promise<Outcome<MatchRecord[]>>;
  /** Send a friend the code of the room you're in; false if it couldn't be sent. */
  invite(friendId: string, code: string): Promise<boolean>;
  dismissInvite(at: number): void;
}

const ADD_RESULTS: Readonly<Record<string, { ok: boolean; message: string }>> = {
  requested: { ok: true, message: '已送出好友邀請，等對方接受' },
  accepted: { ok: true, message: '你們已經是好友了！（對方之前也加過你）' },
  pending: { ok: true, message: '已經送過邀請了，等對方接受' },
  already: { ok: true, message: '你們已經是好友了' },
};
const MAX_INVITES = 3;

let presence: RealtimeChannel | null = null;
let inbox: RealtimeChannel | null = null;

export const useFriendsStore = create<FriendsState>()((set, get) => ({
  friends: [],
  loading: false,
  error: null,
  online: new Set(),
  invites: [],

  refresh: async () => {
    if (!supabase) return;
    set({ loading: true });
    const { data, error } = await supabase.rpc('get_friends');
    if (error) {
      set({ loading: false, error: errorText(error) });
      return;
    }
    const friends = ((data as { id: string; nickname: string; state: FriendState }[]) ?? []).map(
      (f) => ({ id: f.id, nickname: f.nickname, state: f.state }),
    );
    set({ friends, loading: false, error: null });
  },

  add: async (nickname) => {
    if (!supabase) return { ok: false, message: '這個版本沒有連線功能' };
    const name = nickname.trim();
    if (!name) return { ok: false, message: '請輸入對方的暱稱' };
    const { data, error } = await supabase.rpc('send_friend_request', { p_nickname: name });
    if (error) return { ok: false, message: errorText(error) };
    void get().refresh();
    return ADD_RESULTS[String(data)] ?? { ok: true, message: '已送出' };
  },

  respond: async (friendId, accept) => {
    if (!supabase) return;
    await supabase.rpc('respond_friend_request', { p_from: friendId, p_accept: accept });
    await get().refresh();
  },

  remove: async (friendId) => {
    if (!supabase) return;
    await supabase.rpc('remove_friend', { p_friend: friendId });
    await get().refresh();
  },

  friendMatches: async (friendId) => {
    if (!supabase) return { ok: false, error: '這個版本沒有連線功能' };
    const { data, error } = await supabase.rpc('get_friend_matches', {
      p_friend: friendId,
      p_limit: 500,
    });
    if (error) return { ok: false, error: errorText(error) };
    return { ok: true, value: ((data as unknown[]) ?? []).flatMap((m) => parseMatch(m) ?? []) };
  },

  invite: async (friendId, code) => {
    const client = supabase;
    const { userId, nickname } = useAuthStore.getState();
    if (!client || !userId || !nickname) return false;
    const channel = client.channel(`inbox:${friendId}`);
    const subscribed = await new Promise<boolean>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve(true);
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve(false);
      });
    });
    if (subscribed) {
      await channel.send({
        type: 'broadcast',
        event: 'invite',
        payload: { fromId: userId, from: nickname, code },
      });
    }
    void client.removeChannel(channel);
    return subscribed;
  },

  dismissInvite: (at) => set({ invites: get().invites.filter((i) => i.at !== at) }),
}));

async function receiveInvite(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== 'object') return;
  const p = payload as Record<string, unknown>;
  const code = typeof p.code === 'string' ? normalizeRoomCode(p.code) : null;
  const from = typeof p.from === 'string' ? p.from.slice(0, 16) : '';
  const fromId = typeof p.fromId === 'string' ? p.fromId : '';
  if (!code || !from || !fromId) return;
  // Only from friends: nobody else should know your inbox, but check anyway
  // (after a refresh, in case they became a friend a moment ago).
  const isFriend = () =>
    useFriendsStore.getState().friends.some((f) => f.id === fromId && f.state === 'friend');
  if (!isFriend()) await useFriendsStore.getState().refresh();
  if (!isFriend()) return;
  const invites = useFriendsStore
    .getState()
    .invites.filter((i) => !(i.fromId === fromId && i.code === code));
  useFriendsStore.setState({
    invites: [...invites, { fromId, from, code, at: Date.now() }].slice(-MAX_INVITES),
  });
}

function connect(userId: string): void {
  const client = supabase;
  if (!client) return;
  presence = client.channel('online-players', { config: { presence: { key: userId } } });
  presence.on('presence', { event: 'sync' }, () => {
    useFriendsStore.setState({ online: new Set(Object.keys(presence?.presenceState() ?? {})) });
  });
  presence.subscribe((status) => {
    if (status === 'SUBSCRIBED') void presence?.track({ online: true });
  });
  inbox = client.channel(`inbox:${userId}`);
  inbox.on('broadcast', { event: 'invite' }, ({ payload }) => void receiveInvite(payload));
  inbox.subscribe();
}

function disconnect(): void {
  for (const ch of [presence, inbox]) if (ch) void supabase?.removeChannel(ch);
  presence = null;
  inbox = null;
  useFriendsStore.setState({ friends: [], online: new Set(), invites: [], error: null });
}

// Online and listening for invites while signed in with a nickname.
useAuthStore.subscribe((s, prev) => {
  const ready = s.status === 'signedIn' && s.userId !== null && s.nickname !== null;
  const was = prev.status === 'signedIn' && prev.userId !== null && prev.nickname !== null;
  if (ready && !was && s.userId) {
    connect(s.userId);
    void useFriendsStore.getState().refresh();
  } else if (!ready && was) {
    disconnect();
  }
});

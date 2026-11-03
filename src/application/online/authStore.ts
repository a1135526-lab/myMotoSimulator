import { create } from 'zustand';
import { errorText, supabase } from './supabase';

export type AuthStatus = 'offline' | 'loading' | 'signedOut' | 'signedIn';
/** Whether the signed-in player's nickname has been looked up yet. */
export type ProfileStatus = 'unknown' | 'ready' | 'error';

interface AuthState {
  /** offline: this build has no leaderboard server. */
  readonly status: AuthStatus;
  readonly email: string | null;
  /** Your account id (friends and invites are addressed by it). */
  readonly userId: string | null;
  /** Shown on the boards; null until chosen (then scores can't be sent yet). */
  readonly nickname: string | null;
  readonly profile: ProfileStatus;
  /** Look the nickname up again (after a failed attempt). */
  reloadProfile(): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Null when saved, else why not (in words for the player). */
  setNickname(name: string): Promise<string | null>;
}

/** The nickname, or null if none has been chosen; throws when the server can't say. */
async function fetchNickname(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  const row = (data as { nickname: string }[] | null)?.[0];
  return row?.nickname ?? null;
}

/**
 * The nickname last seen for each player on this device, so someone who has
 * signed in before can still get in and ride with no connection.
 */
const NICKNAME_KEY = 'scooter-dyno:nickname';

function cachedNickname(userId: string): string | null {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(NICKNAME_KEY) ?? 'null') as {
      userId?: unknown;
      nickname?: unknown;
    } | null;
    return saved?.userId === userId && typeof saved.nickname === 'string' ? saved.nickname : null;
  } catch {
    return null;
  }
}

function cacheNickname(userId: string | null, nickname: string | null): void {
  try {
    if (userId && nickname) {
      globalThis.localStorage?.setItem(NICKNAME_KEY, JSON.stringify({ userId, nickname }));
    }
  } catch {
    // Not cached: offline starts will need the server.
  }
}

let currentUserId: string | null = null;

function loadProfile(): void {
  const userId = currentUserId;
  useAuthStore.setState({ profile: 'unknown' });
  fetchNickname().then(
    (nickname) => {
      cacheNickname(userId, nickname);
      useAuthStore.setState({ nickname, profile: 'ready' });
    },
    () => {
      const cached = userId ? cachedNickname(userId) : null;
      useAuthStore.setState(cached ? { nickname: cached, profile: 'ready' } : { profile: 'error' });
    },
  );
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: supabase ? 'loading' : 'offline',
  email: null,
  userId: null,
  nickname: null,
  profile: 'unknown',
  reloadProfile: loadProfile,
  signIn: async () => {
    if (!supabase) return;
    // Google's page, then back here; the session is picked up on return.
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href.split('#')[0] },
    });
  },
  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ status: 'signedOut', email: null, userId: null, nickname: null, profile: 'unknown' });
  },
  setNickname: async (name) => {
    if (!supabase) return '目前沒有連線到排行榜';
    const { data, error } = await supabase.rpc('set_nickname', { p_nickname: name });
    if (error) return errorText(error);
    const nickname = typeof data === 'string' ? data : name.trim();
    cacheNickname(currentUserId, nickname);
    set({ nickname });
    return null;
  },
}));

// Follow the session from the start (including the return from Google).
if (supabase) {
  const client = supabase;
  client.auth.onAuthStateChange((_event, session) => {
    currentUserId = session?.user.id ?? null;
    if (!session) {
      useAuthStore.setState({
        status: 'signedOut',
        email: null,
        userId: null,
        nickname: null,
        profile: 'unknown',
      });
      return;
    }
    const wasSignedIn = useAuthStore.getState().status === 'signedIn';
    useAuthStore.setState({
      status: 'signedIn',
      email: session.user.email ?? null,
      userId: session.user.id,
    });
    // Token refreshes keep the same player; only look the nickname up on sign-in.
    // Outside the callback: Supabase asks not to await its own calls in here.
    if (!wasSignedIn) setTimeout(loadProfile, 0);
  });
}

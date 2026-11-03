import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

/**
 * The global leaderboards' connection, or null when this build has none
 * (unit tests, e2e, a fork without its own project): the game then runs
 * offline with only the on-device boards.
 */
export const supabase: SupabaseClient | null =
  url && key && import.meta.env.VITE_ONLINE !== 'off'
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const onlineEnabled = supabase !== null;

/** Server error codes (raised in supabase/schema.sql) as words for the player. */
const MESSAGES: Readonly<Record<string, string>> = {
  not_signed_in: '請先用 Google 登入',
  no_nickname: '請先設定暱稱',
  too_fast: '上傳太頻繁，請稍後再試',
  implausible_time: '成績沒有通過伺服器檢查',
  bad_ghost: '成績沒有通過伺服器檢查',
  nickname_length: '暱稱要 2～16 個字',
  nickname_chars: '暱稱只能用文字、數字、空格、底線和減號',
  nickname_blocked: '暱稱含有不適當的字詞',
  nickname_taken: '這個暱稱已經有人用了',
  friend_not_found: '找不到這個暱稱的玩家',
  friend_self: '不能加自己為好友',
  too_many_friends: '好友數量已達上限（200 位）',
  not_friends: '你們還不是好友',
};

export function errorText(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const code = Object.keys(MESSAGES).find((c) => message.includes(c));
  if (code) return MESSAGES[code] ?? message;
  if (/fetch|network|Failed to/i.test(message)) return '連不上排行榜伺服器，請檢查網路';
  return '排行榜發生錯誤，請稍後再試';
}

import { supabase } from './supabase';

/**
 * Signing up and in with an account name (or an e-mail) and a password,
 * besides Google. Supabase accounts are keyed by e-mail, so a plain account
 * name becomes an address on a domain nobody receives mail at — which is why
 * "Confirm email" must be off in the Supabase dashboard (docs/SUPABASE_SETUP.md).
 */

export const ACCOUNT_DOMAIN = 'players.zouhui.game';
const ACCOUNT_RE = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN = 6;

/** The address Supabase knows the account by; null if it isn't a valid account or e-mail. */
export function accountEmail(input: string): string | null {
  const account = input.trim().toLowerCase();
  if (account.includes('@')) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account) ? account : null;
  return ACCOUNT_RE.test(account) ? `${account}@${ACCOUNT_DOMAIN}` : null;
}

/** What to show for the signed-in account: the account name, or the e-mail. */
export function accountLabel(email: string | null): string | null {
  if (!email) return null;
  const suffix = `@${ACCOUNT_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}

function authError(message: string): string {
  if (/invalid login credentials/i.test(message)) return '帳號或密碼錯誤';
  if (/already registered|already exists/i.test(message)) return '這個帳號已經有人用了';
  if (/password/i.test(message)) return `密碼至少要 ${PASSWORD_MIN} 個字`;
  if (/signups? not allowed|disabled/i.test(message)) return '目前沒有開放帳號註冊';
  if (/rate limit|too many/i.test(message)) return '嘗試太多次，請稍後再試';
  if (/fetch|network|Failed to/i.test(message)) return '連不上伺服器，請檢查網路';
  return '登入發生錯誤，請稍後再試';
}

const BAD_ACCOUNT = '帳號要 3～20 個英文小寫、數字或底線（也可以用 e-mail）';

/** Null when signed in; else why not, in words. */
export async function signInWithPassword(
  account: string,
  password: string,
): Promise<string | null> {
  if (!supabase) return '這個版本沒有連線功能';
  const email = accountEmail(account);
  if (!email) return BAD_ACCOUNT;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? authError(error.message) : null;
}

/** A new account, signed straight in; null on success, else why not. */
export async function signUpWithPassword(
  account: string,
  password: string,
): Promise<string | null> {
  if (!supabase) return '這個版本沒有連線功能';
  const email = accountEmail(account);
  if (!email) return BAD_ACCOUNT;
  if (password.length < PASSWORD_MIN) return `密碼至少要 ${PASSWORD_MIN} 個字`;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return authError(error.message);
  if (!data.session) {
    return email.endsWith(`@${ACCOUNT_DOMAIN}`)
      ? '註冊完成，但伺服器要求信箱驗證，帳號名稱無法登入；請改用 e-mail 註冊或聯絡管理員'
      : '註冊完成！請到信箱點確認信後再登入';
  }
  return null;
}

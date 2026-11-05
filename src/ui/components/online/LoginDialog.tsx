import { useState } from 'react';
import { PASSWORD_MIN, signInWithPassword, signUpWithPassword, useAuthStore } from '@/application';
import styles from './online.module.css';

type Tab = 'login' | 'register';

/** Sign in: Google, or the game's own account and password (sign up right here). */
export function LoginDialog() {
  const open = useAuthStore((s) => s.loginOpen);
  const close = useAuthStore((s) => s.closeLogin);
  const google = useAuthStore((s) => s.signInWithGoogle);
  const [tab, setTab] = useState<Tab>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const register = tab === 'register';
  const submit = async () => {
    if (register && password !== confirm) {
      setMessage('兩次輸入的密碼不一樣');
      return;
    }
    setBusy(true);
    const problem = await (register ? signUpWithPassword : signInWithPassword)(account, password);
    setBusy(false);
    // Success closes the dialog when the session arrives.
    setMessage(problem);
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-label="登入" data-testid="login-dialog">
      <form
        className={styles.dialog}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2>🔑 登入</h2>
        <p className={styles.lead}>
          登入後成績會上全球排行榜，也能加好友、打排位賽。不登入也能玩。
        </p>
        <button
          type="button"
          className={styles.googleButton}
          onClick={() => void google()}
          data-testid="login-google"
        >
          用 Google 登入
        </button>
        <p className={styles.divider}>或使用遊戲帳號</p>
        <div className={styles.chips} role="tablist">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setMessage(null);
              }}
              data-testid={`login-tab-${t}`}
            >
              {t === 'login' ? '登入' : '註冊新帳號'}
            </button>
          ))}
        </div>
        <label className={styles.field}>
          帳號（3～20 個英文小寫、數字、底線，或 e-mail）
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={80}
            data-testid="login-account"
          />
        </label>
        <label className={styles.field}>
          密碼（至少 {PASSWORD_MIN} 個字）
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={register ? 'new-password' : 'current-password'}
            data-testid="login-password"
          />
        </label>
        {register && (
          <label className={styles.field}>
            再輸入一次密碼
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              data-testid="login-confirm"
            />
          </label>
        )}
        {register && (
          <p className={styles.note}>
            用帳號名稱註冊的話，忘記密碼無法找回；想要能找回請用 e-mail 註冊。
          </p>
        )}
        {message && <p className={styles.error}>{message}</p>}
        <div className={styles.actions}>
          <button type="button" onClick={close}>
            取消
          </button>
          <button
            type="submit"
            className={styles.primary}
            disabled={busy || !account.trim() || password.length < PASSWORD_MIN}
            data-testid="login-submit"
          >
            {busy ? '處理中…' : register ? '註冊並登入' : '登入'}
          </button>
        </div>
        <button type="button" className={styles.close} onClick={close} aria-label="關閉">
          ✕
        </button>
      </form>
    </div>
  );
}

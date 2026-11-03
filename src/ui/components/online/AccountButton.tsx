import { useEffect, useState } from 'react';
import { useAuthStore } from '@/application';
import { NicknameDialog } from './NicknameDialog';
import styles from './online.module.css';

const PRIVACY_URL = `${import.meta.env.BASE_URL}privacy.html`;

/**
 * Header: sign in with Google to join the global boards; once signed in,
 * the nickname, with changing it, the privacy policy and signing out.
 */
export function AccountButton() {
  const status = useAuthStore((s) => s.status);
  const nickname = useAuthStore((s) => s.nickname);
  const profile = useAuthStore((s) => s.profile);
  const email = useAuthStore((s) => s.email);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const [menu, setMenu] = useState(false);
  const [naming, setNaming] = useState(false);
  const [asked, setAsked] = useState(false);

  // Signed in and the server says there's no nickname yet: ask once.
  useEffect(() => {
    if (status === 'signedIn' && profile === 'ready' && nickname === null && !asked) {
      setAsked(true);
      setNaming(true);
    }
  }, [status, profile, nickname, asked]);

  if (status === 'offline' || status === 'loading') return null;

  if (status === 'signedOut') {
    return (
      <button
        type="button"
        className={styles.headerButton}
        data-primary=""
        onClick={() => void signIn()}
        title="用 Google 登入，成績就能上全球排行榜"
        data-testid="sign-in"
      >
        🔑 Google 登入
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.headerButton}
        onClick={() => setMenu(true)}
        data-testid="account-button"
      >
        👤 {nickname ?? '設定暱稱'}
      </button>
      {menu && (
        <div className={styles.backdrop} role="dialog" aria-label="帳號">
          <div className={styles.dialog}>
            <h2>👤 {nickname ?? '還沒有暱稱'}</h2>
            <p className={styles.lead}>
              已用 Google 登入{email ? `（${email}，不會公開）` : ''}
              。跑出的成績會自動上傳到全球排行榜。
            </p>
            <div className={styles.actions}>
              <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
                隱私權政策
              </a>
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  void signOut();
                }}
              >
                登出
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setMenu(false);
                  setNaming(true);
                }}
              >
                {nickname ? '修改暱稱' : '設定暱稱'}
              </button>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => setMenu(false)}
              aria-label="關閉"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {naming && <NicknameDialog onClose={() => setNaming(false)} />}
    </>
  );
}

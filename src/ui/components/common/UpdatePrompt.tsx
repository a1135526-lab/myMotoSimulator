import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './common.module.css';

const OFFLINE_NOTE_MS = 4000;

/**
 * The installed app keeps playing the cached version; when a newer one has
 * downloaded, ask before reloading so a race is never cut off mid-run.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => setOfflineReady(false), OFFLINE_NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className={styles.toast} role="status" data-testid="update-prompt">
        <span>有新版本可以更新</span>
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          更新
        </button>
        <button type="button" onClick={() => setNeedRefresh(false)}>
          稍後
        </button>
      </div>
    );
  }
  if (offlineReady) {
    return (
      <div className={styles.toast} role="status">
        <span>已下載完成，沒有網路也能玩</span>
      </div>
    );
  }
  return null;
}

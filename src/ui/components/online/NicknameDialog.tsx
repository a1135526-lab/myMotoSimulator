import { useState } from 'react';
import { useAuthStore } from '@/application';
import styles from './online.module.css';

/** Pick (or change) the name shown on the global boards. */
export function NicknameDialog({ onClose }: { onClose: () => void }) {
  const current = useAuthStore((s) => s.nickname);
  const setNickname = useAuthStore((s) => s.setNickname);
  const [name, setName] = useState(current ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const problem = await setNickname(name);
    setSaving(false);
    if (problem) setError(problem);
    else onClose();
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-label="設定暱稱"
      data-testid="nickname-dialog"
    >
      <form
        className={styles.dialog}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2>{current ? '修改暱稱' : '取一個暱稱'}</h2>
        <p className={styles.lead}>
          暱稱會顯示在全球排行榜上，其他玩家看得到；你的 Google 帳號和信箱不會公開。
        </p>
        <label className={styles.field}>
          暱稱（2～16 個字）
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={16}
            autoFocus
            placeholder="例如：楠梓車神"
            data-testid="nickname-input"
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button type="button" onClick={onClose}>
            {current ? '取消' : '稍後再說'}
          </button>
          <button
            type="submit"
            className={styles.primary}
            disabled={saving || name.trim().length < 2}
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>
    </div>
  );
}

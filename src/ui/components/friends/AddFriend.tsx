import { useState } from 'react';
import { useAuthStore, useFriendsStore } from '@/application';
import styles from './friends.module.css';

/**
 * ＋好友 for someone you raced, by their account name: a request, or where
 * things stand if you're already friends or asked. Only when you're signed
 * in and they were (no account name, nothing to add).
 */
export function AddFriend({
  accountName,
  testId = 'add-friend',
}: {
  accountName?: string | undefined;
  testId?: string;
}) {
  const friends = useFriendsStore((s) => s.friends);
  const add = useFriendsStore((s) => s.add);
  const me = useAuthStore((s) => (s.status === 'signedIn' ? s.nickname : null));
  const [sent, setSent] = useState<string | null>(null);
  if (!me || !accountName || accountName.toLowerCase() === me.toLowerCase()) return null;
  const known = friends.find((f) => f.nickname.toLowerCase() === accountName.toLowerCase());
  if (known?.state === 'friend') return <small className={styles.friendTag}>好友</small>;
  if (known || sent) return <small className={styles.friendTag}>{sent ?? '已送出邀請'}</small>;
  return (
    <button
      type="button"
      className={styles.addFriend}
      onClick={() => void add(accountName).then((r) => setSent(r.ok ? '已送出邀請' : r.message))}
      data-testid={testId}
    >
      ＋好友
    </button>
  );
}

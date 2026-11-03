import { useState } from 'react';
import { onlineEnabled, useFriendsStore } from '@/application';
import { FriendsDialog } from './FriendsDialog';
import styles from './friends.module.css';

/** Lobby: open the friends list; a badge counts requests waiting for you. */
export function FriendsButton() {
  const [open, setOpen] = useState(false);
  const waiting = useFriendsStore((s) => s.friends.filter((f) => f.state === 'incoming').length);
  if (!onlineEnabled) return null;
  return (
    <>
      <button
        type="button"
        className={styles.friendsButton}
        onClick={() => setOpen(true)}
        data-testid="open-friends"
      >
        👥 好友
        {waiting > 0 && <span className={styles.badge}>{waiting}</span>}
      </button>
      {open && <FriendsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

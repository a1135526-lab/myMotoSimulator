import { useState } from 'react';
import { onlineEnabled } from '@/application';
import { AccountButton } from './AccountButton';
import { LeaderboardDialog } from './LeaderboardDialog';
import styles from './online.module.css';

/** Header corner: the global leaderboard and the account. Absent offline. */
export function OnlineHeader() {
  const [open, setOpen] = useState(false);
  if (!onlineEnabled) return null;
  return (
    <>
      <button
        type="button"
        className={styles.headerButton}
        onClick={() => setOpen(true)}
        data-testid="open-leaderboard"
      >
        🏆 排行榜
      </button>
      <AccountButton />
      {open && <LeaderboardDialog onClose={() => setOpen(false)} />}
    </>
  );
}

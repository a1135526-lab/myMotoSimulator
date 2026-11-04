import { useState } from 'react';
import { useRoomStore, type RoomPlayer } from '@/application';
import { PlayerCardDialog } from '../../components/friends/PlayerCardDialog';
import { AddFriendButton } from './RoomFriends';
import styles from './room.module.css';

/** At the results: who you raced, a look at each, and adding them as friends. */
export function RoomOpponents() {
  const me = useRoomStore((s) => s.me);
  const players = useRoomStore((s) => s.players);
  const again = useRoomStore((s) => s.again);
  const [viewing, setViewing] = useState<RoomPlayer | null>(null);
  const others = players.filter((p) => p.id !== me?.id);
  if (others.length === 0) return null;

  return (
    <div className={styles.opponents} data-testid="room-opponents">
      <h3>對手</h3>
      <ul>
        {others.map((p) => (
          <li key={p.id}>
            <span className={styles.oppName}>
              {p.name}
              <small>{p.bike}</small>
            </span>
            {again.includes(p.id) && <small className={styles.friendTag}>想再來一場</small>}
            <button
              type="button"
              className={styles.addFriend}
              onClick={() => setViewing(p)}
              data-testid="room-view-player"
            >
              查看
            </button>
            <AddFriendButton player={p} />
          </li>
        ))}
      </ul>
      {viewing && (
        <PlayerCardDialog
          name={viewing.name}
          bike={viewing.bike}
          {...(viewing.accountName && { accountName: viewing.accountName })}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

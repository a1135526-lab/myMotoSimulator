import { useState } from 'react';
import { useAuthStore, useFriendsStore, useRoomStore, type RoomPlayer } from '@/application';
import { AddFriend } from '../../components/friends/AddFriend';
import styles from './room.module.css';

/** In a room: add another signed-in player as a friend. */
export function AddFriendButton({ player }: { player: RoomPlayer }) {
  return <AddFriend accountName={player.accountName} testId="room-add-friend" />;
}

/** In a room: send your online friends its code. */
export function RoomFriends() {
  const friends = useFriendsStore((s) => s.friends);
  const online = useFriendsStore((s) => s.online);
  const invite = useFriendsStore((s) => s.invite);
  const players = useRoomStore((s) => s.players);
  const code = useRoomStore((s) => s.code);
  const signedIn = useAuthStore((s) => s.status === 'signedIn' && s.nickname !== null);
  const [invited, setInvited] = useState<ReadonlySet<string>>(new Set());
  if (!signedIn) return null;
  const inRoom = new Set(
    players.flatMap((p) => (p.accountName ? [p.accountName.toLowerCase()] : [])),
  );
  const list = friends
    .filter((f) => f.state === 'friend' && !inRoom.has(f.nickname.toLowerCase()))
    .sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)));

  return (
    <>
      <h3>邀請好友</h3>
      {list.length === 0 ? (
        <p className={styles.note}>沒有其他好友。到大廳的「👥 好友」用暱稱加朋友。</p>
      ) : (
        <ul className={styles.friendList}>
          {list.map((f) => {
            const on = online.has(f.id);
            const done = invited.has(f.id);
            return (
              <li key={f.id}>
                <span className={styles.dot} data-online={on || undefined} />
                <span>{f.nickname}</span>
                <button
                  type="button"
                  className={styles.addFriend}
                  disabled={!on || done || !code}
                  onClick={() =>
                    code &&
                    void invite(f.id, code).then(
                      (ok) => ok && setInvited((s) => new Set(s).add(f.id)),
                    )
                  }
                  data-testid="room-invite-friend"
                >
                  {done ? '已邀請' : on ? '邀請' : '離線'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

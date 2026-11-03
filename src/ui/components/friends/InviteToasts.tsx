import { useFriendsStore } from '@/application';
import { joinInvite } from './roomInvite';
import { useRoomProfile } from './useRoomProfile';
import styles from './friends.module.css';

/** On any screen: a friend asking you into their room. */
export function InviteToasts() {
  const invites = useFriendsStore((s) => s.invites);
  const dismiss = useFriendsStore((s) => s.dismissInvite);
  const profile = useRoomProfile();
  if (invites.length === 0) return null;
  return (
    <div className={styles.invites} role="status">
      {invites.map((i) => (
        <div key={i.at} className={styles.invite} data-testid="room-invite">
          <span>
            🎮 <strong>{i.from}</strong> 邀請你加入好友對戰（房號 {i.code}）
          </span>
          <button
            type="button"
            className={styles.small}
            data-accent=""
            onClick={() => {
              dismiss(i.at);
              void joinInvite(i.code, profile);
            }}
          >
            加入
          </button>
          <button type="button" className={styles.small} onClick={() => dismiss(i.at)}>
            忽略
          </button>
        </div>
      ))}
    </div>
  );
}

import { useRoomStore } from '@/application';
import styles from '../circuit/results.module.css';

/** End of a room race: the host runs it back or returns everyone to the lobby. */
export function RoomResultActions() {
  const me = useRoomStore((s) => s.me);
  const host = useRoomStore((s) => s.players[0]);
  const startRace = useRoomStore((s) => s.startRace);
  const backToLobby = useRoomStore((s) => s.backToLobby);
  const leave = useRoomStore((s) => s.leave);
  if (me && host?.id === me.id) {
    return (
      <div className={styles.resultActions}>
        <button type="button" className={styles.secondary} onClick={backToLobby}>
          回到房間
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={startRace}
          autoFocus
          data-testid="room-rematch"
        >
          再比一場
        </button>
      </div>
    );
  }
  return (
    <div className={styles.resultActions}>
      <button type="button" className={styles.secondary} onClick={leave}>
        離開房間
      </button>
      <span className={styles.waitHost}>等待房主 {host?.name ?? ''} 開始下一場…</span>
    </div>
  );
}

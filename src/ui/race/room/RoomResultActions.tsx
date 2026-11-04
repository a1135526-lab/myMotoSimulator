import { useRoomStore } from '@/application';
import styles from '../circuit/results.module.css';

/**
 * End of a room race: race again or leave. The host starts the next one (and
 * sees who's keen); everyone else says they're in and waits for the host.
 */
export function RoomResultActions() {
  const me = useRoomStore((s) => s.me);
  const players = useRoomStore((s) => s.players);
  const again = useRoomStore((s) => s.again);
  const startRace = useRoomStore((s) => s.startRace);
  const wantAgain = useRoomStore((s) => s.wantAgain);
  const backToLobby = useRoomStore((s) => s.backToLobby);
  const leave = useRoomStore((s) => s.leave);
  const host = players[0];
  const keen = players.filter((p) => p.id !== me?.id && again.includes(p.id)).length;

  if (me && host?.id === me.id) {
    return (
      <div className={styles.resultActions}>
        {players.length > 1 && (
          <span className={styles.waitHost}>
            {keen}/{players.length - 1} 人想再來一場
          </span>
        )}
        <button type="button" className={styles.secondary} onClick={leave}>
          離開房間
        </button>
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
          再來一場
        </button>
      </div>
    );
  }
  const asked = me !== null && again.includes(me.id);
  return (
    <div className={styles.resultActions}>
      {asked && <span className={styles.waitHost}>已告訴房主 {host?.name ?? ''}，等待開始…</span>}
      <button type="button" className={styles.secondary} onClick={leave}>
        離開房間
      </button>
      <button
        type="button"
        className={styles.primary}
        onClick={wantAgain}
        disabled={asked}
        autoFocus
        data-testid="room-rematch"
      >
        再來一場
      </button>
    </div>
  );
}

import { useState } from 'react';
import { MAX_ROOM_PLAYERS, useCircuits, useRoomStore } from '@/application';
import { BikeSelector } from '../../components/config/BikeSelector';
import { AddFriendButton, RoomFriends } from './RoomFriends';
import styles from './room.module.css';

const LAP_CHOICES = [1, 2, 3, 5] as const;

/** Waiting room: the code to share, who's in, the host's circuit and laps, your bike. */
export function RoomLobby() {
  const code = useRoomStore((s) => s.code);
  const me = useRoomStore((s) => s.me);
  const players = useRoomStore((s) => s.players);
  const settings = useRoomStore((s) => s.settings);
  const waiting = useRoomStore((s) => s.waitingForNext);
  const setSettings = useRoomStore((s) => s.setSettings);
  const startRace = useRoomStore((s) => s.startRace);
  const leave = useRoomStore((s) => s.leave);
  const circuits = useCircuits();
  const [copied, setCopied] = useState(false);
  const host = players[0];
  const iAmHost = !!me && host?.id === me.id;
  const circuit = circuits.find((c) => c.id === settings.circuitId);

  const invite = `來揍灰來尬掐跟我比賽！好友對戰的房號：${code ?? ''}\n${window.location.origin}${import.meta.env.BASE_URL}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to read out.
    }
  };

  return (
    <section className={styles.panel} data-testid="room-lobby">
      <div className={styles.codeBox}>
        <span>房號</span>
        <strong data-testid="room-code">{code}</strong>
        <button type="button" className={styles.secondary} onClick={() => void copy()}>
          {copied ? '已複製 ✓' : '📋 複製邀請'}
        </button>
      </div>

      <h3>
        玩家 {players.length} / {MAX_ROOM_PLAYERS}
      </h3>
      <ol className={styles.players} data-testid="room-players">
        {players.map((p) => (
          <li key={p.id} data-me={p.id === me?.id || undefined}>
            <strong>{p.name}</strong>
            {p.id === host?.id && <small className={styles.hostTag}>房主</small>}
            {p.id === me?.id && <small className={styles.meTag}>你</small>}
            {p.id !== me?.id && <AddFriendButton player={p} />}
            <span className={styles.bike}>{p.bike}</span>
          </li>
        ))}
      </ol>

      <h3>賽道與圈數{iAmHost ? '' : `（由房主 ${host?.name ?? ''} 決定）`}</h3>
      {iAmHost ? (
        <>
          <div className={styles.chips}>
            {circuits.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={c.id === settings.circuitId}
                onClick={() => setSettings({ ...settings, circuitId: c.id })}
                data-testid={`room-circuit-${c.id}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className={styles.chips}>
            {LAP_CHOICES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={n === settings.laps}
                onClick={() => setSettings({ ...settings, laps: n })}
              >
                {n} 圈
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className={styles.settings} data-testid="room-settings">
          {circuit?.name ?? settings.circuitId} · {settings.laps} 圈
        </p>
      )}

      <RoomFriends />

      <h3>你的機車</h3>
      <BikeSelector />
      <p className={styles.note}>改裝設定沿用車庫；比賽中車和車之間不會碰撞。</p>

      {waiting && <p className={styles.notice}>比賽進行中，下一場開始時你就會加入。</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={leave}>
          離開房間
        </button>
        {iAmHost ? (
          <button
            type="button"
            className={styles.primary}
            onClick={startRace}
            data-testid="room-start"
          >
            🏁 開始比賽
          </button>
        ) : (
          <span className={styles.waiting}>等待房主開始…</span>
        )}
      </div>
    </section>
  );
}

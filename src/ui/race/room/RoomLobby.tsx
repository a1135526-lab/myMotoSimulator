import { useState } from 'react';
import {
  circuitChoices,
  MAX_ROOM_PLAYERS,
  useCircuits,
  useRoomStore,
  type RoomSettings,
} from '@/application';
import { BikeSelector } from '../../components/config/BikeSelector';
import { AddFriendButton, RoomFriends } from './RoomFriends';
import styles from './room.module.css';

const LAP_CHOICES = [1, 2, 3, 5] as const;

const GRID_LABELS = { staggered: '交錯起步', parallel: '平行起步' } as const;

const withGrid = (s: RoomSettings, grid: keyof typeof GRID_LABELS): RoomSettings => {
  const { circuitId, laps, ranked, items } = s;
  return {
    circuitId,
    laps,
    ...(ranked && { ranked }),
    ...(grid === 'parallel' && { grid }),
    ...(items && { items }),
  };
};

/** Item race on or off; a plain race can't stay on an item-race circuit. */
function withItems(s: RoomSettings, on: boolean): RoomSettings {
  const choices = circuitChoices(on);
  const circuitId = choices.some((c) => c.id === s.circuitId)
    ? s.circuitId
    : (choices[0]?.id ?? s.circuitId);
  const { laps, ranked, grid } = s;
  return {
    circuitId,
    laps,
    ...(ranked && { ranked }),
    ...(grid && { grid }),
    ...(on && { items: true as const }),
  };
}

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
  const all = useCircuits();
  const circuits = circuitChoices(settings.items === true);
  const [copied, setCopied] = useState(false);
  const host = players[0];
  const iAmHost = !!me && host?.id === me.id;
  const circuit = all.find((c) => c.id === settings.circuitId);

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
            {[false, true].map((on) => (
              <button
                key={String(on)}
                type="button"
                aria-pressed={(settings.items === true) === on}
                onClick={() => setSettings(withItems(settings, on))}
                data-testid={on ? 'room-items-on' : 'room-items-off'}
              >
                {on ? '🎁 道具賽' : '一般賽'}
              </button>
            ))}
          </div>
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
          <div className={styles.chips}>
            {(['staggered', 'parallel'] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={(settings.grid ?? 'staggered') === g}
                onClick={() => setSettings(withGrid(settings, g))}
                data-testid={`room-grid-${g}`}
              >
                {GRID_LABELS[g]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className={styles.settings} data-testid="room-settings">
          {settings.items ? '🎁 道具賽 · ' : ''}
          {circuit?.name ?? settings.circuitId} · {settings.laps} 圈 ·{' '}
          {GRID_LABELS[settings.grid ?? 'staggered']}
        </p>
      )}

      <RoomFriends />

      <h3>你的機車</h3>
      <BikeSelector />
      <p className={styles.note}>改裝設定沿用車庫；起步後 4 秒內車和車之間不會碰撞。</p>

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

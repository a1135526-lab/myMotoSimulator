import { useState } from 'react';
import {
  CODE_LENGTH,
  MAX_ROOM_PLAYERS,
  onlineEnabled,
  useAuthStore,
  useRoomStore,
  type RoomProfile,
} from '@/application';
import { saveRoomName, savedRoomName } from './roomName';
import styles from './room.module.css';

interface RoomEntryProps {
  readonly profile: Omit<RoomProfile, 'name'>;
  readonly onBack: () => void;
}

/** Make a room (and get its code) or join a friend's with theirs. */
export function RoomEntry({ profile, onBack }: RoomEntryProps) {
  const nickname = useAuthStore((s) => s.nickname);
  const status = useRoomStore((s) => s.status);
  const error = useRoomStore((s) => s.error);
  const settings = useRoomStore((s) => s.settings);
  const create = useRoomStore((s) => s.create);
  const join = useRoomStore((s) => s.join);
  const [name, setName] = useState(() => nickname ?? savedRoomName());
  const [code, setCode] = useState('');
  const busy = status === 'connecting';
  const nameOk = name.trim().length >= 1;

  const me = (): RoomProfile => {
    saveRoomName(name.trim());
    return { ...profile, name: name.trim() };
  };

  if (!onlineEnabled) {
    return (
      <section className={styles.panel}>
        <p className={styles.error}>這個版本沒有連線功能，無法使用好友房間。</p>
        <button type="button" className={styles.secondary} onClick={onBack}>
          ← 回到比賽模式
        </button>
      </section>
    );
  }

  return (
    <section className={styles.panel} data-testid="room-entry">
      <h2>👥 好友對戰</h2>
      <p className={styles.lead}>
        和朋友在同一條賽道上比賽，最多 {MAX_ROOM_PLAYERS} 人。一個人建立房間，把房號告訴朋友。
      </p>
      <label className={styles.field}>
        你的名字
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder="顯示給其他玩家看"
          data-testid="room-name"
        />
      </label>

      <div className={styles.choices}>
        <div className={styles.choice}>
          <h3>建立房間</h3>
          <p>你當房主，選賽道和圈數。</p>
          <button
            type="button"
            className={styles.primary}
            disabled={busy || !nameOk}
            onClick={() => void create(me(), settings)}
            data-testid="room-create"
          >
            {busy ? '連線中…' : '建立房間'}
          </button>
        </div>
        <div className={styles.choice}>
          <h3>加入房間</h3>
          <input
            className={styles.code}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={CODE_LENGTH}
            placeholder="房號"
            autoCapitalize="characters"
            autoComplete="off"
            data-testid="room-code-input"
          />
          <button
            type="button"
            className={styles.primary}
            disabled={busy || !nameOk || code.trim().length !== CODE_LENGTH}
            onClick={() => void join(code, me())}
            data-testid="room-join"
          >
            {busy ? '尋找房間中…' : '加入'}
          </button>
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert" data-testid="room-error">
          {error}
        </p>
      )}
      <button type="button" className={styles.secondary} onClick={onBack}>
        ← 回到比賽模式
      </button>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useAuthStore, useFriendsStore, type Friend } from '@/application';
import { FriendProfileDialog } from './FriendProfileDialog';
import { inviteToRace } from './roomInvite';
import { useRoomProfile } from './useRoomProfile';
import styles from './friends.module.css';

/** Friends: add by nickname, answer requests, invite to race, look at their record. */
export function FriendsDialog({ onClose }: { onClose: () => void }) {
  const status = useAuthStore((s) => s.status);
  const nickname = useAuthStore((s) => s.nickname);
  const signIn = useAuthStore((s) => s.signIn);
  const friends = useFriendsStore((s) => s.friends);
  const online = useFriendsStore((s) => s.online);
  const error = useFriendsStore((s) => s.error);
  const { refresh, add, respond, remove } = useFriendsStore.getState();
  const profile = useRoomProfile();
  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [viewing, setViewing] = useState<Friend | null>(null);
  const ready = status === 'signedIn' && nickname !== null;

  useEffect(() => {
    if (ready) void refresh();
  }, [ready, refresh]);

  const submit = async () => {
    const res = await add(name);
    setMessage({ ok: res.ok, text: res.message });
    if (res.ok) setName('');
  };
  const invite = async (f: Friend) => {
    const res = await inviteToRace(f.id, profile);
    setMessage({ ok: res.ok, text: `${f.nickname}：${res.message}` });
    if (res.ok) onClose();
  };

  const incoming = friends.filter((f) => f.state === 'incoming');
  const mine = friends.filter((f) => f.state === 'friend');
  const outgoing = friends.filter((f) => f.state === 'outgoing');

  return (
    <div className={styles.backdrop} role="dialog" aria-label="好友">
      <section className={styles.dialog} data-testid="friends-dialog">
        <h2>👥 好友</h2>
        {!ready ? (
          <>
            <p className={styles.note}>
              {status === 'signedIn'
                ? '先到右上角的帳號設定一個暱稱，朋友才找得到你。'
                : '好友功能要先登入：登入後可以用暱稱加好友、邀請好友一起比賽、看好友的戰績。'}
            </p>
            {status === 'signedOut' && (
              <button type="button" className={styles.primary} onClick={() => void signIn()}>
                🔑 登入
              </button>
            )}
          </>
        ) : (
          <>
            <p className={styles.note}>你的暱稱是「{nickname}」，朋友可以用它加你。</p>
            <form
              className={styles.addRow}
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={16}
                placeholder="輸入朋友的暱稱"
                data-testid="friend-name"
              />
              <button type="submit" className={styles.primary} disabled={!name.trim()}>
                加好友
              </button>
            </form>
            {message && (
              <p className={styles.message} data-bad={message.ok ? undefined : ''}>
                {message.text}
              </p>
            )}
            {error && (
              <p className={styles.message} data-bad="">
                {error}
              </p>
            )}

            {incoming.length > 0 && (
              <>
                <h3>好友邀請</h3>
                <ul className={styles.list}>
                  {incoming.map((f) => (
                    <li key={f.id}>
                      <span className={styles.name}>{f.nickname}</span>
                      <button
                        type="button"
                        className={styles.small}
                        data-accent=""
                        onClick={() => void respond(f.id, true)}
                      >
                        接受
                      </button>
                      <button
                        type="button"
                        className={styles.small}
                        onClick={() => void respond(f.id, false)}
                      >
                        拒絕
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3>好友（{mine.length}）</h3>
            {mine.length === 0 ? (
              <p className={styles.empty}>
                還沒有好友。輸入朋友的暱稱，或在好友房間裡按「＋好友」。
              </p>
            ) : (
              <ul className={styles.list} data-testid="friend-list">
                {mine.map((f) => {
                  const on = online.has(f.id);
                  return (
                    <li key={f.id}>
                      <span className={styles.name}>
                        <span className={styles.dot} data-online={on || undefined} />
                        {f.nickname}
                      </span>
                      <button
                        type="button"
                        className={styles.small}
                        data-accent=""
                        disabled={!on}
                        title={on ? '開一個房間並邀請他' : '對方不在線上'}
                        onClick={() => void invite(f)}
                      >
                        邀請比賽
                      </button>
                      <button type="button" className={styles.small} onClick={() => setViewing(f)}>
                        查看資訊
                      </button>
                      <button
                        type="button"
                        className={styles.small}
                        onClick={() => void remove(f.id)}
                      >
                        移除
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {outgoing.length > 0 && (
              <>
                <h3>等對方接受</h3>
                <ul className={styles.list}>
                  {outgoing.map((f) => (
                    <li key={f.id}>
                      <span className={styles.name}>{f.nickname}</span>
                      <button
                        type="button"
                        className={styles.small}
                        onClick={() => void remove(f.id)}
                      >
                        取消
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
          ✕
        </button>
      </section>
      {viewing && <FriendProfileDialog friend={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

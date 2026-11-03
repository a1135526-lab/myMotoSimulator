import { useEffect, useState } from 'react';
import { RANKED_GROUP_LABELS, useRankedStore, useRoomStore } from '@/application';
import styles from './ranked.module.css';

const GIVE_UP_S = 20;

/** Looking for players, or matched and waiting for them to come in. */
export function RankedWaiting() {
  const phase = useRankedStore((s) => s.phase);
  const group = useRankedStore((s) => s.group);
  const queuedAt = useRankedStore((s) => s.queuedAt);
  const inQueue = useRankedStore((s) => s.inQueue);
  const match = useRankedStore((s) => s.match);
  const cancel = useRankedStore((s) => s.cancel);
  const players = useRoomStore((s) => s.players);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const waited = queuedAt ? Math.floor((now - queuedAt) / 1000) : 0;

  return (
    <section className={styles.panel} data-testid="ranked-waiting">
      {phase === 'queue' ? (
        <>
          <div className={styles.spinner} aria-hidden />
          <h2>配對中…（{RANKED_GROUP_LABELS[group]}）</h2>
          <p className={styles.big}>
            {waited} / {GIVE_UP_S} 秒
          </p>
          <p className={styles.note}>
            {inQueue > 0 ? `還有 ${inQueue} 位玩家在排隊` : '目前沒有其他玩家在排隊'}，{GIVE_UP_S}{' '}
            秒內沒配到就改跟電腦比。
          </p>
        </>
      ) : (
        <>
          <h2>✅ 配對成功！</h2>
          <p className={styles.note}>
            等待對手進場（{players.length} / {match?.size ?? '?'}），到齊就開始。
          </p>
          <ul className={styles.players}>
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className={styles.secondary} onClick={cancel}>
        取消
      </button>
    </section>
  );
}

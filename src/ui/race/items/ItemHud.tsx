import { useEffect, useState } from 'react';
import { ITEM_IDS, ITEM_INFO, useItemStore, type ItemView } from '@/application';
import styles from './items.module.css';

/** How long a hit / block line stays up, ms. */
const TOAST_MS = 1600;
/** The spinner changes picture this often, ms. */
const SPIN_MS = 70;

function ItemToastLine() {
  const toast = useItemStore((s) => s.toast);
  const [shown, setShown] = useState(toast);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const timer = window.setTimeout(() => setShown(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);
  if (!shown) return null;
  return (
    <p className={styles.toast} data-tone={shown.tone} role="status" data-testid="item-toast">
      {shown.text}
    </p>
  );
}

const secs = (s: number) => `${Math.ceil(s)}`;

/** Your item slot (with the spinner after a pick-up), what's on you, and warnings. */
export function ItemHud({ items }: { items: ItemView }) {
  const spinning = items.rolling;
  const shown = spinning
    ? (ITEM_IDS[Math.floor(performance.now() / SPIN_MS) % ITEM_IDS.length] ?? null)
    : items.held;
  const info = shown ? ITEM_INFO[shown] : null;
  return (
    <div className={styles.hud}>
      <div
        className={styles.slot}
        data-spinning={spinning || undefined}
        data-empty={!info || undefined}
        aria-label={info && !spinning ? `道具：${info.name}` : '道具欄'}
        data-testid="item-slot"
        data-item={spinning ? 'rolling' : (items.held ?? 'none')}
      >
        <span className={styles.icon}>{info ? info.icon : '🎁'}</span>
        <span className={styles.name}>
          {info && !spinning
            ? `${info.name}${items.held === 'triple-boost' ? ` ×${items.charges}` : ''}`
            : spinning
              ? '抽道具中…'
              : '騎過道具箱'}
        </span>
        {info && !spinning && <kbd className={styles.key}>Z</kbd>}
      </div>
      <div className={styles.effects}>
        {items.boosting && <span className={styles.chip}>🔥 加速中</span>}
        {items.shieldLeftS !== null && (
          <span className={styles.chip}>🛡️ {secs(items.shieldLeftS)}</span>
        )}
        {items.skateLeftS !== null && (
          <span className={styles.chipBad} data-testid="skate-left">
            🛹 滑板車 {secs(items.skateLeftS)}
          </span>
        )}
      </div>
      {items.chased && (
        <p className={styles.warn} data-testid="item-chased">
          ⚠ 紙飛機接近
        </p>
      )}
      <ItemToastLine />
    </div>
  );
}

/** Grey haze over the picture while you're in someone's smoke; never in the way of a tap. */
export function SmokeHaze({ on }: { on: boolean }) {
  return on ? <div className={styles.haze} aria-hidden /> : null;
}

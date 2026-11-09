import { useState } from 'react';
import { LIVERY_PRESETS, useLiveryStore, type Livery } from '@/application';
import dialog from '../horn/horn.module.css';
import styles from './livery.module.css';

const PARTS: readonly (readonly [keyof Livery, string])[] = [
  ['body', '車身'],
  ['helmet', '安全帽'],
  ['jacket', '車手服'],
];

/** A side view of bike and rider in the chosen colours. */
export function LiveryPreview({ livery }: { livery: Livery }) {
  return (
    <svg className={styles.preview} viewBox="0 0 200 120" role="img" aria-label="外觀預覽">
      <circle cx="45" cy="92" r="20" fill="#16181c" stroke="#9aa0a7" strokeWidth="4" />
      <circle cx="155" cy="92" r="20" fill="#16181c" stroke="#9aa0a7" strokeWidth="4" />
      <path d="M40 80 L70 58 L130 52 L165 70 L150 84 L60 88 Z" fill={livery.body} />
      <path d="M128 44 L160 50 L168 70 L140 64 Z" fill={livery.body} />
      <rect x="62" y="52" width="40" height="8" rx="3" fill="#17191d" />
      <path d="M78 52 L100 22 L112 26 L100 56 Z" fill={livery.jacket} />
      <path d="M104 30 L132 44 L128 50 L102 38 Z" fill={livery.jacket} />
      <path d="M80 54 L66 74 L76 78 L88 58 Z" fill={livery.jacket} />
      <circle cx="108" cy="16" r="12" fill={livery.helmet} />
      <path d="M110 12 A12 12 0 0 1 120 19 L110 19 Z" fill="#0b0f14" />
    </svg>
  );
}

/** Pick your bike's colours: everyone you race sees them. */
export function LiveryDialog({ onClose }: { onClose: () => void }) {
  const livery = useLiveryStore((s) => s.livery);
  const setLivery = useLiveryStore((s) => s.setLivery);
  return (
    <div className={dialog.backdrop} role="dialog" aria-label="車輛外觀">
      <section className={dialog.dialog} data-testid="livery-settings">
        <h2>🎨 車輛外觀</h2>
        <p className={dialog.note}>好友對戰和排位賽時，其他玩家看到的就是這個顏色。</p>
        <LiveryPreview livery={livery} />
        <div className={styles.presets}>
          {LIVERY_PRESETS.map(([name, preset]) => (
            <button
              key={name}
              type="button"
              className={styles.preset}
              onClick={() => setLivery(preset)}
              aria-pressed={Object.values(preset).join() === Object.values(livery).join()}
            >
              <span className={styles.swatch} style={{ background: preset.body }} />
              {name}
            </button>
          ))}
        </div>
        <div className={styles.pickers}>
          {PARTS.map(([part, label]) => (
            <label key={part} className={styles.picker}>
              <input
                type="color"
                value={livery[part]}
                onChange={(e) => setLivery({ [part]: e.target.value })}
                data-testid={`livery-${part}`}
              />
              {label}
            </label>
          ))}
        </div>
        <button type="button" className={dialog.close} onClick={onClose} aria-label="關閉">
          ✕
        </button>
      </section>
    </div>
  );
}

/** Opens the livery settings. */
export function LiveryButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className ?? dialog.settingsButton}
        onClick={() => setOpen(true)}
        data-testid="open-livery"
      >
        🎨 車輛外觀
      </button>
      {open && <LiveryDialog onClose={() => setOpen(false)} />}
    </>
  );
}

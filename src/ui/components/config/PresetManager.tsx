import { useState, type FormEvent } from 'react';
import { useConfigStore, usePresetStore, useUiStore } from '@/application';
import styles from './config.module.css';

/** Save / load / delete named setups, and pick one to overlay on the dyno. */
export function PresetManager() {
  const [name, setName] = useState('');
  const presets = usePresetStore((s) => s.presets);
  const save = usePresetStore((s) => s.save);
  const remove = usePresetStore((s) => s.remove);
  const bikeId = useConfigStore((s) => s.bikeId);
  const selection = useConfigStore((s) => s.selection);
  const applyPreset = useConfigStore((s) => s.applyPreset);
  const compareId = useUiStore((s) => s.comparePresetId);
  const setCompare = useUiStore((s) => s.setComparePreset);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    save(name, bikeId, selection);
    setName('');
  };

  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>改裝組合</span>
      <form className={styles.presetForm} onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="命名目前設定"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="改裝組合名稱"
        />
        <button type="submit" className={styles.primary} disabled={!name.trim()}>
          儲存
        </button>
      </form>
      {presets.length === 0 ? (
        <p className={styles.hint}>尚未儲存任何組合</p>
      ) : (
        <ul className={styles.presetList}>
          {presets.map((p) => (
            <li key={p.id}>
              <span className={styles.presetName} title={p.bikeId}>
                {p.name}
              </span>
              <button type="button" onClick={() => applyPreset(p)}>
                載入
              </button>
              <button
                type="button"
                aria-pressed={compareId === p.id}
                className={compareId === p.id ? styles.active : undefined}
                onClick={() => setCompare(compareId === p.id ? null : p.id)}
              >
                比較
              </button>
              <button
                type="button"
                aria-label={`刪除 ${p.name}`}
                onClick={() => {
                  if (compareId === p.id) setCompare(null);
                  remove(p.id);
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

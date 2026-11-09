import { useEffect, useRef, useState } from 'react';
import { HORN_CLIP_MAX_CHARS, HORN_PRESETS, useHornStore, type HornPreset } from '@/application';
import { canRecord, RECORD_MAX_S, startRecording, type Recording } from '../../audio/hornRecorder';
import { previewHorn } from '../../audio/hornSounds';
import styles from './horn.module.css';

const LABELS: Readonly<Record<HornPreset, string>> = {
  standard: '一般喇叭',
  beep: '嗶嗶（小綿羊）',
  truck: '大卡車',
  tune: '音樂喇叭',
  custom: '自訂錄音',
};

type RecState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'recording'; readonly rec: Recording }
  | { readonly kind: 'error'; readonly message: string };

/** Pick the horn sound, or record your own with the microphone. */
export function HornSettingsDialog({ onClose }: { onClose: () => void }) {
  const preset = useHornStore((s) => s.preset);
  const clip = useHornStore((s) => s.clip);
  const setPreset = useHornStore((s) => s.setPreset);
  const setClip = useHornStore((s) => s.setClip);
  const [rec, setRec] = useState<RecState>({ kind: 'idle' });
  const [draft, setDraft] = useState<string | null>(null);
  const live = useRef<Recording | null>(null);

  // Never leave the microphone on behind a closed dialog.
  useEffect(() => () => live.current?.stop(), []);

  const record = async () => {
    try {
      const r = await startRecording();
      live.current = r;
      setRec({ kind: 'recording', rec: r });
      const url = await r.done;
      live.current = null;
      if (url.length > HORN_CLIP_MAX_CHARS) {
        setRec({ kind: 'error', message: '錄音檔太大，請錄短一點。' });
        return;
      }
      setDraft(url);
      setRec({ kind: 'idle' });
    } catch {
      live.current = null;
      setRec({ kind: 'error', message: '無法使用麥克風。請允許麥克風權限（需要 https 連線）。' });
    }
  };

  const keep = () => {
    if (!draft) return;
    if (!setClip(draft)) {
      setRec({ kind: 'error', message: '這台裝置無法儲存錄音，只會在這次使用。' });
    }
    setDraft(null);
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-label="喇叭設定">
      <section className={styles.dialog} data-testid="horn-settings">
        <h2>📯 喇叭設定</h2>
        <p className={styles.note}>騎車時按住 H 鍵或「📯」按鈕按喇叭。</p>
        <ul className={styles.presets}>
          {HORN_PRESETS.map((p) => {
            const off = p === 'custom' && !clip;
            return (
              <li key={p}>
                <label data-off={off || undefined}>
                  <input
                    type="radio"
                    name="horn"
                    checked={preset === p}
                    disabled={off}
                    onChange={() => setPreset(p)}
                    data-testid={`horn-${p}`}
                  />
                  {LABELS[p]}
                  {off && <small>（先錄一段）</small>}
                </label>
                <button
                  type="button"
                  className={styles.small}
                  disabled={off}
                  onClick={() => previewHorn(p, clip)}
                  aria-label={`試聽${LABELS[p]}`}
                >
                  ▶ 試聽
                </button>
              </li>
            );
          })}
        </ul>

        <h3>自訂錄音</h3>
        {!canRecord() ? (
          <p className={styles.note}>這個瀏覽器不支援錄音。</p>
        ) : (
          <div className={styles.recorder}>
            {rec.kind === 'recording' ? (
              <button
                type="button"
                className={styles.recording}
                onClick={() => rec.rec.stop()}
                data-testid="horn-record-stop"
              >
                ⏹ 停止（最長 {RECORD_MAX_S} 秒）
              </button>
            ) : (
              <button
                type="button"
                className={styles.primary}
                onClick={() => void record()}
                data-testid="horn-record"
              >
                🎙 {clip || draft ? '重新錄音' : '開始錄音'}
              </button>
            )}
            {draft && (
              <>
                <button
                  type="button"
                  className={styles.small}
                  onClick={() => previewHorn('custom', draft)}
                >
                  ▶ 聽聽看
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={keep}
                  data-testid="horn-keep"
                >
                  使用這段
                </button>
              </>
            )}
            {clip && !draft && (
              <button type="button" className={styles.small} onClick={() => setClip(null)}>
                刪除錄音
              </button>
            )}
          </div>
        )}
        {rec.kind === 'error' && (
          <p className={styles.message} role="alert">
            {rec.message}
          </p>
        )}
        <button type="button" className={styles.close} onClick={onClose} aria-label="關閉">
          ✕
        </button>
      </section>
    </div>
  );
}

/** Opens the horn settings. */
export function HornSettingsButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className ?? styles.settingsButton}
        onClick={() => setOpen(true)}
        data-testid="open-horn-settings"
      >
        📯 喇叭設定
      </button>
      {open && <HornSettingsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

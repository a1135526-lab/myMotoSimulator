import { useRaceStore } from '@/application';
import { FlickShiftToggle, TiltToggle } from '../../components/controls/StageButtons';
import styles from './ranked.module.css';

/** How you ride (not what): the same for everyone, so these are allowed in ranked. */
export function RankedControls() {
  const autoShift = useRaceStore((s) => s.autoShift);
  const setAutoShift = useRaceStore((s) => s.setAutoShift);
  const autoClutch = useRaceStore((s) => s.autoClutch);
  const setAutoClutch = useRaceStore((s) => s.setAutoClutch);

  return (
    <details className={styles.rules} data-testid="ranked-controls">
      <summary>操作設定</summary>
      <div className={styles.controls}>
        <label>
          <input
            type="checkbox"
            checked={autoShift}
            onChange={(e) => setAutoShift(e.target.checked)}
            data-testid="ranked-auto-shift"
          />
          自動換檔（打檔車組）
        </label>
        {!autoShift && (
          <label>
            <input
              type="checkbox"
              checked={autoClutch}
              onChange={(e) => setAutoClutch(e.target.checked)}
            />
            自動半離合（關閉就要自己按 Shift 拉離合）
          </label>
        )}
        <div className={styles.motion}>
          <TiltToggle className={styles.secondary} />
          {!autoShift && <FlickShiftToggle className={styles.secondary} />}
        </div>
        <p className={styles.note}>
          傾斜轉向、甩動換檔只在手機上出現，比賽中上方的按鈕也可以切換。轉向輔助和煞車輔助在排位賽一律關閉。
        </p>
      </div>
    </details>
  );
}

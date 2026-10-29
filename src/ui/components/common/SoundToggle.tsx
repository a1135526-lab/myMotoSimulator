import { useUiStore } from '@/application';
import styles from './common.module.css';

export function SoundToggle() {
  const on = useUiStore((s) => s.soundOn);
  const setOn = useUiStore((s) => s.setSoundOn);
  return (
    <button
      type="button"
      className={on ? styles.soundOn : styles.sound}
      aria-pressed={on}
      onClick={() => setOn(!on)}
      title={on ? '關閉引擎聲' : '開啟引擎聲'}
      data-testid="sound-toggle"
    >
      <span aria-hidden>{on ? '🔊' : '🔇'}</span>
      {on ? '聲音開' : '聲音關'}
    </button>
  );
}

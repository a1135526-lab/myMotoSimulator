import { useUiStore } from '@/application';
import styles from './common.module.css';

export function MusicToggle() {
  const on = useUiStore((s) => s.musicOn);
  const setOn = useUiStore((s) => s.setMusicOn);
  return (
    <button
      type="button"
      className={on ? styles.soundOn : styles.sound}
      aria-pressed={on}
      onClick={() => setOn(!on)}
      title={on ? '關閉大廳音樂' : '開啟大廳音樂'}
      data-testid="music-toggle"
    >
      <span aria-hidden>{on ? '🎵' : '🔈'}</span>
      {on ? '音樂開' : '音樂關'}
    </button>
  );
}

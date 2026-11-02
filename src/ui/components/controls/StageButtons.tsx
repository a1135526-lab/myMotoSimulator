import { useEffect, useState } from 'react';
import { requestTiltPermission, useUiStore } from '@/application';
import { PHONE_PORTRAIT_QUERY, useMediaQuery } from '../../layouts/useMediaQuery';
import styles from './controls.module.css';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

const isIos = () =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** Opened from the home screen icon: already without browser bars. */
const isInstalled = () =>
  (typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * Full screen and landscape lock (Android and desktop). iPhone Safari can't
 * do this for a page; there the home screen app is the way, see RotateHint.
 */
export function FullscreenButton({ className }: { className?: string }) {
  const [active, setActive] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const update = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  if (!document.fullscreenEnabled) return null;

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (o: 'landscape') => Promise<void>;
      };
      await orientation.lock?.('landscape');
    } catch {
      // Refused (no gesture, not supported): the page just stays as it is.
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={() => void toggle()}
      title={active ? '離開全螢幕' : '全螢幕'}
      aria-label={active ? '離開全螢幕' : '全螢幕'}
      data-testid="fullscreen-toggle"
    >
      {active ? '🗗' : '⛶'}
    </button>
  );
}

/** Steer by turning the phone like a wheel. Only offered on touch devices. */
export function TiltToggle({ className }: { className?: string }) {
  const on = useUiStore((s) => s.tiltOn);
  const setOn = useUiStore((s) => s.setTiltOn);
  const [problem, setProblem] = useState<string | null>(null);
  if (!isTouchDevice()) return null;

  const toggle = async () => {
    if (on) return setOn(false);
    if (!window.isSecureContext) return setProblem('傾斜轉向需要 https 網址');
    const permission = await requestTiltPermission();
    if (permission === 'granted') {
      setProblem(null);
      setOn(true);
    } else {
      setProblem(permission === 'unsupported' ? '這台裝置沒有動作感測器' : '沒有允許使用動作感測');
    }
  };

  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      onClick={() => void toggle()}
      title={problem ?? '像方向盤一樣轉動手機來轉彎；開啟時的角度就是直走'}
      data-testid="tilt-toggle"
      data-problem={problem ? '' : undefined}
    >
      📱 {problem ?? (on ? '傾斜轉向 開' : '傾斜轉向')}
    </button>
  );
}

/** Phone held upright in a 3D mode: point at landscape (and, on iPhone, the home screen). */
export function RotateHint() {
  const portrait = useMediaQuery(PHONE_PORTRAIT_QUERY);
  if (!portrait) return null;
  return (
    <p className={styles.rotateHint} data-testid="rotate-hint">
      📱 把手機橫過來，就能全螢幕遊玩
      {isIos() && !isInstalled() && (
        <small>iPhone 從 Safari「分享 → 加入主畫面」開啟，可以完全隱藏網址列</small>
      )}
    </p>
  );
}

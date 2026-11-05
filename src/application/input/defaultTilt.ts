import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';
import { requestTiltPermission } from './TiltInputSource';

/**
 * Tilt steering is the default on phones. Android turns it on straight away;
 * iOS only lets a tap ask for the motion sensors, so there it switches on at
 * the first tap anywhere. Turning it off is remembered.
 */

const KEY = 'scooter-dyno:tilt';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

function tiltWanted(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

/** The player switched tilt on or off: keep it that way next time. */
export function saveTiltWanted(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Not persisted; the toggle still works for this visit.
  }
}

const needsTap = () =>
  typeof DeviceOrientationEvent !== 'undefined' &&
  typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
    .requestPermission === 'function';

/** Once, at the app's root: switch tilt steering on if this phone can. */
export function useDefaultTilt(): void {
  useEffect(() => {
    if (!isTouchDevice() || !window.isSecureContext || !tiltWanted()) return;
    if (useUiStore.getState().tiltOn) return;
    const ask = () =>
      void requestTiltPermission().then((p) => {
        if (p === 'granted' && tiltWanted()) useUiStore.getState().setTiltOn(true);
      });
    if (!needsTap()) {
      ask();
      return;
    }
    const onTap = () => {
      document.removeEventListener('click', onTap, true);
      if (!useUiStore.getState().tiltOn) ask();
    };
    document.addEventListener('click', onTap, true);
    return () => document.removeEventListener('click', onTap, true);
  }, []);
}

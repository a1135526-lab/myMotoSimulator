import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';
import { requestTiltPermission } from './TiltInputSource';

/**
 * Tilt steering and flick shifting (manual bikes) are the default on phones.
 * Android turns them on straight away; iOS only lets a tap ask for the
 * motion sensors, so there they switch on at the first tap anywhere.
 * Turning either off is remembered.
 */

const KEY = 'scooter-dyno:tilt';
const FLICK_KEY = 'scooter-dyno:flick';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

function wanted(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(key) !== 'off';
  } catch {
    return true;
  }
}

function saveWanted(key: string, on: boolean): void {
  try {
    globalThis.localStorage?.setItem(key, on ? 'on' : 'off');
  } catch {
    // Not persisted; the toggle still works for this visit.
  }
}

const tiltWanted = () => wanted(KEY);
const flickWanted = () => wanted(FLICK_KEY);

/** The player switched tilt on or off: keep it that way next time. */
export const saveTiltWanted = (on: boolean) => saveWanted(KEY, on);
/** The player switched flick shifting on or off: keep it that way next time. */
export const saveFlickWanted = (on: boolean) => saveWanted(FLICK_KEY, on);

const needsTap = () =>
  typeof DeviceOrientationEvent !== 'undefined' &&
  typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
    .requestPermission === 'function';

/** Once, at the app's root: switch tilt steering and flick shifting on if this phone can. */
export function useDefaultTilt(): void {
  useEffect(() => {
    if (!isTouchDevice() || !window.isSecureContext) return;
    if (!tiltWanted() && !flickWanted()) return;
    const ask = () =>
      void requestTiltPermission().then((p) => {
        if (p !== 'granted') return;
        const ui = useUiStore.getState();
        if (tiltWanted() && !ui.tiltOn) ui.setTiltOn(true);
        if (flickWanted() && !ui.flickShiftOn) ui.setFlickShiftOn(true);
      });
    if (!needsTap()) {
      ask();
      return;
    }
    const onTap = () => {
      document.removeEventListener('click', onTap, true);
      ask();
    };
    document.addEventListener('click', onTap, true);
    return () => document.removeEventListener('click', onTap, true);
  }, []);
}

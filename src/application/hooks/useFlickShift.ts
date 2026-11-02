import { useEffect } from 'react';
import { FlickShiftSource } from '../input/FlickShiftSource';
import type { ActionListener } from '../input/InputSource';
import { useUiStore } from '../stores/uiStore';

/** A short buzz confirms a flick shift where the phone can (not iPhone Safari). */
const SHIFT_BUZZ_MS = 15;

/** While flick shifting is on, flicking the phone shifts this controller's bike. */
export function useFlickShift(controller: { readonly handleAction: ActionListener }): void {
  const on = useUiStore((s) => s.flickShiftOn);
  useEffect(() => {
    if (!on) return;
    const source = new FlickShiftSource(window, (action) => {
      controller.handleAction(action);
      navigator.vibrate?.(SHIFT_BUZZ_MS);
    });
    return () => source.dispose();
  }, [controller, on]);
}

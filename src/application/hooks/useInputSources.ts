import { useEffect } from 'react';
import { KeyboardInputSource, type KeyLayout } from '../input/KeyboardInputSource';
import type { ActionListener, CompositeInputSource } from '../input/InputSource';
import type { TouchInputSource } from '../input/TouchInputSource';

export interface InputDriven {
  readonly input: CompositeInputSource;
  readonly touch: TouchInputSource;
  readonly handleAction: ActionListener;
}

/**
 * Attaches the keyboard (on the window) and the on-screen buttons to the
 * controller for its lifetime. The buttons are re-attached here, not only in
 * the controller's constructor: StrictMode's dev remount runs the provider's
 * `dispose()`, which detaches every source, and only effects run again.
 */
export function useInputSources(controller: InputDriven, layout: KeyLayout = 'standard'): void {
  useEffect(() => {
    const detachKeys = controller.input.add(
      new KeyboardInputSource(window, controller.handleAction, layout),
    );
    const detachTouch = controller.input.add(controller.touch);
    return () => {
      detachKeys();
      detachTouch();
    };
  }, [controller, layout]);
}

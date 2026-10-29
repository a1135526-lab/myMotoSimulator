import { useEffect } from 'react';
import { KeyboardInputSource } from '../input/KeyboardInputSource';
import type { ActionListener, CompositeInputSource } from '../input/InputSource';

export interface KeyboardDriven {
  readonly input: CompositeInputSource;
  readonly handleAction: ActionListener;
}

/** Attaches ↑/↓/R/Space handling to the window for the controller's lifetime. */
export function useKeyboardControls(controller: KeyboardDriven): void {
  useEffect(
    () => controller.input.add(new KeyboardInputSource(window, controller.handleAction)),
    [controller],
  );
}

import { useEffect } from 'react';
import { KeyboardInputSource } from '../input/KeyboardInputSource';
import type { SimulationController } from '../simulation/SimulationController';

/** Attaches ↑/↓/R/Space handling to the window for the controller's lifetime. */
export function useKeyboardControls(controller: SimulationController): void {
  useEffect(
    () => controller.input.add(new KeyboardInputSource(window, controller.handleAction)),
    [controller],
  );
}

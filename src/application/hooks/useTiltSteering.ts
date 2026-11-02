import { useEffect } from 'react';
import type { CompositeInputSource } from '../input/InputSource';
import { TiltInputSource } from '../input/TiltInputSource';
import { useUiStore } from '../stores/uiStore';

/** While tilt steering is on, turning the phone steers this controller's bike. */
export function useTiltSteering(controller: { readonly input: CompositeInputSource }): void {
  const on = useUiStore((s) => s.tiltOn);
  useEffect(() => {
    if (!on) return;
    return controller.input.add(new TiltInputSource(window));
  }, [controller, on]);
}

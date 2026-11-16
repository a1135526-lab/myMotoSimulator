import { useEffect, useRef } from 'react';
import type { CompositeInputSource } from '../input/InputSource';
import { TiltInputSource } from '../input/TiltInputSource';
import { useUiStore } from '../stores/uiStore';

/**
 * While tilt steering is on, turning the phone steers this controller's bike.
 * While `following()` holds, however the phone is held steady is straight ahead.
 */
export function useTiltSteering(
  controller: { readonly input: CompositeInputSource },
  following: () => boolean = () => false,
): void {
  const on = useUiStore((s) => s.tiltOn);
  const follow = useRef(following);
  follow.current = following;
  useEffect(() => {
    if (!on) return;
    return controller.input.add(new TiltInputSource(window, () => follow.current()));
  }, [controller, on]);
}

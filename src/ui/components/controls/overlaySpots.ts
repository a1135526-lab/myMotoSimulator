import type { ControlLayoutKind, OverlayButton } from '@/application';

/** Default spot of a button centre: px in from a bottom corner, at size 1. */
export interface Anchor {
  readonly corner: 'left' | 'right';
  readonly dx: number;
  readonly dy: number;
}

/**
 * Thumbs on the picture: steering (or the brake, on a drag strip) under the
 * left thumb, throttle under the right; the rest in a row just above them.
 */
export function defaultAnchor(id: OverlayButton, kind: ControlLayoutKind, manual: boolean): Anchor {
  const left = (dx: number, dy: number): Anchor => ({ corner: 'left', dx, dy });
  const right = (dx: number, dy: number): Anchor => ({ corner: 'right', dx, dy });
  switch (id) {
    case 'steerLeft':
      return left(50, 48);
    case 'steerRight':
      return left(134, 48);
    case 'brake':
      return kind === 'drag' ? left(50, 48) : right(146, 48);
    case 'throttle':
      return right(54, 62);
    case 'clutch':
      return left(44, 120);
    case 'reverse':
      return left(manual ? 116 : 44, 120);
    case 'shiftUp':
      return right(42, 150);
    case 'shiftDown':
      return right(110, 150);
    case 'start':
      return right(174, 150);
    case 'reset':
      return manual ? right(234, 150) : right(40, 146);
    case 'item':
      // Above the right-lean button: the right thumb's shift row and the
      // minimap over it leave no room on that side.
      return left(134, 124);
  }
}

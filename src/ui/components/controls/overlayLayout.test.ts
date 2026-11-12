import { describe, expect, it } from 'vitest';
import type { OverlayButton } from '@/application';
import { defaultAnchor } from './overlaySpots';

/** Button sizes on the picture (controls.module.css, `.overlay …`), px. */
const SIZE: Readonly<Record<OverlayButton, readonly [number, number]>> = {
  steerLeft: [76, 76],
  steerRight: [76, 76],
  brake: [76, 76],
  throttle: [84, 104],
  clutch: [64, 64],
  reverse: [52, 44],
  reset: [52, 44],
  start: [52, 44],
  shiftDown: [60, 52],
  shiftUp: [60, 52],
  item: [64, 64],
};

/** Box of a button at its default spot, px from the bottom-left of a 900 px wide screen. */
function box(id: OverlayButton, manual: boolean) {
  const a = defaultAnchor(id, 'steer', manual);
  const [w, h] = SIZE[id];
  const cx = a.corner === 'left' ? a.dx : 900 - a.dx;
  return { id, x0: cx - w / 2, x1: cx + w / 2, y0: a.dy - h / 2, y1: a.dy + h / 2 };
}

const overlaps = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('full-screen buttons on a circuit', () => {
  for (const manual of [true, false]) {
    it(`no two default spots overlap (${manual ? 'manual' : 'scooter'}, item race)`, () => {
      const shown: OverlayButton[] = [
        'steerLeft',
        'steerRight',
        'brake',
        'throttle',
        'reset',
        'item',
        ...(manual ? (['clutch', 'shiftDown', 'shiftUp', 'start'] as const) : []),
      ];
      const boxes = shown.map((id) => box(id, manual));
      for (const a of boxes) {
        for (const b of boxes) {
          if (a.id < b.id) expect(overlaps(a, b), `${a.id} / ${b.id}`).toBe(false);
        }
      }
    });
  }
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'scooter-dyno:control-layout';

/** A fresh store module, as on the next visit, reading whatever is saved. */
async function freshStore() {
  vi.resetModules();
  return (await import('./controlLayoutStore')).useControlLayoutStore;
}

describe('control layout store', () => {
  beforeEach(() => localStorage.clear());

  it('remembers moved buttons and size for the next visit, per layout', async () => {
    const store = await freshStore();
    store.getState().moveButton('steer', 'throttle', { x: 0.7, y: 0.4 });
    store.getState().setScale(1.2);
    const next = await freshStore();
    expect(next.getState().spots.steer.throttle).toEqual({ x: 0.7, y: 0.4 });
    expect(next.getState().spots.drag.throttle).toBeUndefined();
    expect(next.getState().scale).toBeCloseTo(1.2);
  });

  it('keeps spots on screen and the size within limits', async () => {
    const store = await freshStore();
    store.getState().moveButton('drag', 'brake', { x: -0.3, y: 1.8 });
    store.getState().setScale(9);
    expect(store.getState().spots.drag.brake).toEqual({ x: 0, y: 1 });
    expect(store.getState().scale).toBe(1.5);
  });

  it('reset puts one layout back to defaults', async () => {
    const store = await freshStore();
    store.getState().moveButton('drag', 'brake', { x: 0.5, y: 0.5 });
    store.getState().moveButton('steer', 'brake', { x: 0.5, y: 0.5 });
    store.getState().resetLayout('drag');
    expect(store.getState().spots.drag).toEqual({});
    expect(store.getState().spots.steer.brake).toBeDefined();
  });

  it('ignores damaged or unknown saved data', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        spots: { steer: { throttle: { x: 'a' }, horn: { x: 0.1, y: 0.1 } } },
        scale: 'big',
      }),
    );
    let store = await freshStore();
    expect(store.getState().spots.steer).toEqual({});
    expect(store.getState().scale).toBe(1);
    localStorage.setItem(KEY, '{not json');
    store = await freshStore();
    expect(store.getState().spots).toEqual({ drag: {}, steer: {} });
  });
});

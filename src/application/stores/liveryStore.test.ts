import { describe, expect, it } from 'vitest';
import { parsePlayer } from '../online/room/roomTypes';
import { DEFAULT_LIVERY, parseLivery, useLiveryStore } from './liveryStore';

describe('livery', () => {
  it('only takes #rrggbb colours', () => {
    expect(parseLivery(DEFAULT_LIVERY)).toEqual(DEFAULT_LIVERY);
    expect(parseLivery({ ...DEFAULT_LIVERY, body: 'red' })).toBeNull();
    expect(parseLivery({ ...DEFAULT_LIVERY, helmet: 'url(x)' })).toBeNull();
  });

  it('is kept on this device', () => {
    useLiveryStore.getState().setLivery({ body: '#123456' });
    expect(useLiveryStore.getState().livery.body).toBe('#123456');
    expect(globalThis.localStorage.getItem('scooter-dyno:livery')).toContain('#123456');
    useLiveryStore.getState().setLivery({ body: 'nope' });
    expect(useLiveryStore.getState().livery.body).toBe('#123456');
  });

  it('travels with a room player, and bad colours are dropped', () => {
    const base = { id: 'a', name: '阿明', bike: 'X', manual: false, cylinders: 1, joinedAt: 1 };
    expect(parsePlayer({ ...base, livery: DEFAULT_LIVERY })?.livery).toEqual(DEFAULT_LIVERY);
    expect(parsePlayer({ ...base, livery: { body: 'red' } })?.livery).toBeUndefined();
  });
});

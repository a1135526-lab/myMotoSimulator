import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GhostLap } from '@/domain';

async function fresh() {
  vi.resetModules();
  return import('./recordsStore');
}

const lap = (lapS: number) => ({ lapS, bike: 'SYM JET SL', manual: false, assisted: false, at: 1 });

describe('records store', () => {
  beforeEach(() => localStorage.clear());

  it('keeps each circuit board in order, top 10, and reports the place', async () => {
    const { useRecordsStore, LAP_BOARD_SIZE } = await fresh();
    const add = useRecordsStore.getState().addLap;
    expect(add('park', lap(70))).toBe(1);
    expect(add('park', lap(65))).toBe(1);
    expect(add('park', lap(68))).toBe(2);
    for (let i = 0; i < LAP_BOARD_SIZE; i++) add('park', lap(60 + i / 10));
    expect(add('park', lap(99))).toBeNull();
    expect(useRecordsStore.getState().laps.park).toHaveLength(LAP_BOARD_SIZE);
    expect(useRecordsStore.getState().laps.hill).toBeUndefined();
  });

  it('remembers boards for the next visit and drops damaged entries', async () => {
    let store = (await fresh()).useRecordsStore;
    store.getState().addLap('park', lap(70));
    store.getState().addMissionRun('m1', { timeS: 42, stars: 3, bike: 'X', crashes: 0, at: 1 });
    const saved = JSON.parse(localStorage.getItem('scooter-dyno:records') ?? '{}');
    saved.laps.park.push({ lapS: 'fast' });
    localStorage.setItem('scooter-dyno:records', JSON.stringify(saved));
    store = (await fresh()).useRecordsStore;
    expect(store.getState().laps.park?.map((r) => r.lapS)).toEqual([70]);
    expect(store.getState().missions.m1?.[0]?.timeS).toBe(42);
  });

  it('drops laps and ghosts set on circuits since redrawn, once, and keeps the rest', async () => {
    localStorage.setItem(
      'scooter-dyno:records',
      JSON.stringify({ laps: { 'practice-park': [lap(70)], 'south-bay': [lap(90)] } }),
    );
    localStorage.setItem('scooter-dyno:ghost:practice-park', '{}');
    let store = (await fresh()).useRecordsStore;
    expect(store.getState().laps['practice-park']).toBeUndefined();
    expect(store.getState().laps['south-bay']).toHaveLength(1);
    expect(localStorage.getItem('scooter-dyno:ghost:practice-park')).toBeNull();
    // A lap on the new layout stays.
    store.getState().addLap('practice-park', lap(75));
    store = (await fresh()).useRecordsStore;
    expect(store.getState().laps['practice-park']?.map((r) => r.lapS)).toEqual([75]);
  });

  it('stores a ghost compactly and reads it back', async () => {
    const { saveGhost, loadGhost } = await fresh();
    const ghost: GhostLap = {
      lapS: 61.234,
      bike: 'Kawasaki Ninja 400',
      manual: true,
      samples: Array.from({ length: 600 }, (_, i) => ({
        t: i / 10,
        x: Math.cos(i / 50) * 120.123456,
        z: Math.sin(i / 50) * 80.98765,
        heading: i / 50,
        lean: Math.sin(i / 20) * 0.6,
      })),
    };
    saveGhost('park', ghost);
    expect((localStorage.getItem('scooter-dyno:ghost:park') ?? '').length).toBeLessThan(40_000);
    const back = loadGhost('park');
    expect(back?.lapS).toBe(61.234);
    expect(back?.samples).toHaveLength(600);
    expect(back?.samples[123]?.x).toBeCloseTo(ghost.samples[123]?.x ?? 0, 1);
    expect(loadGhost('nowhere')).toBeNull();
    localStorage.setItem('scooter-dyno:ghost:bad', '{"lapS":1,"bike":"x","s":[1,2,3]}');
    expect(loadGhost('bad')).toBeNull();
  });
});

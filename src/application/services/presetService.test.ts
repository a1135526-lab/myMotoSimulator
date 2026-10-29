import { describe, expect, it } from 'vitest';
import { getBike } from '@/data';
import { createPresetStore } from '../stores/presetStore';
import { createStockSelection } from '../tuning/selection';
import {
  createPreset,
  InMemoryPresetRepository,
  LocalStoragePresetRepository,
} from './presetService';

const bike = getBike('sym-drg-158');
const selection = createStockSelection(bike);

class MemoryStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
}

describe('LocalStoragePresetRepository', () => {
  it('round-trips presets', () => {
    const repo = new LocalStoragePresetRepository(new MemoryStorage());
    const preset = createPreset('  街道設定  ', bike.id, selection);
    repo.save(preset);
    expect(repo.list()).toEqual([{ ...preset, name: '街道設定' }]);
    repo.remove(preset.id);
    expect(repo.list()).toEqual([]);
  });

  it('drops corrupt entries and survives bad JSON', () => {
    const storage = new MemoryStorage();
    const repo = new LocalStoragePresetRepository(storage);
    const good = createPreset('ok', bike.id, selection);
    storage.setItem(LocalStoragePresetRepository.KEY, JSON.stringify([good, { id: 1 }]));
    expect(repo.list()).toEqual([good]);
    storage.setItem(LocalStoragePresetRepository.KEY, '{not json');
    expect(repo.list()).toEqual([]);
  });

  it('degrades gracefully when storage throws or is missing', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const repo = new LocalStoragePresetRepository(throwing);
    expect(() => repo.save(createPreset('x', bike.id, selection))).not.toThrow();
    expect(repo.list()).toEqual([]);
    expect(new LocalStoragePresetRepository(undefined).list()).toEqual([]);
  });
});

describe('preset store', () => {
  it('saves and removes through the repository', () => {
    const store = createPresetStore(new InMemoryPresetRepository());
    const preset = store.getState().save('賽道', bike.id, selection);
    expect(store.getState().presets).toHaveLength(1);
    store.getState().remove(preset.id);
    expect(store.getState().presets).toHaveLength(0);
  });
});

import { z } from 'zod';
import { TuneSelectionSchema, type TuneSelection } from '../tuning/selection';

export interface Preset {
  readonly id: string;
  readonly name: string;
  readonly bikeId: string;
  readonly selection: TuneSelection;
  readonly savedAt: string;
}

const PresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  bikeId: z.string().min(1),
  selection: TuneSelectionSchema,
  savedAt: z.string(),
});

/** Storage-agnostic so it can move to Capacitor Preferences or a backend later. */
export interface PresetRepository {
  list(): Preset[];
  save(preset: Preset): void;
  remove(id: string): void;
}

export class InMemoryPresetRepository implements PresetRepository {
  private presets: Preset[] = [];

  list(): Preset[] {
    return [...this.presets];
  }

  save(preset: Preset): void {
    this.presets = [...this.presets.filter((p) => p.id !== preset.id), preset];
  }

  remove(id: string): void {
    this.presets = this.presets.filter((p) => p.id !== id);
  }
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Persists to localStorage. Every access is guarded: private mode or blocked
 * storage degrades to an empty list rather than breaking the app, and corrupt
 * or outdated entries are dropped individually.
 */
export class LocalStoragePresetRepository implements PresetRepository {
  static readonly KEY = 'scooter-dyno:presets:v1';

  constructor(private readonly storage: KeyValueStorage | undefined) {}

  list(): Preset[] {
    try {
      const raw = this.storage?.getItem(LocalStoragePresetRepository.KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.flatMap((item) => {
        const result = PresetSchema.safeParse(item);
        return result.success ? [result.data] : [];
      });
    } catch {
      return [];
    }
  }

  save(preset: Preset): void {
    this.write([...this.list().filter((p) => p.id !== preset.id), preset]);
  }

  remove(id: string): void {
    this.write(this.list().filter((p) => p.id !== id));
  }

  private write(presets: Preset[]): void {
    try {
      this.storage?.setItem(LocalStoragePresetRepository.KEY, JSON.stringify(presets));
    } catch {
      // Quota exceeded or storage blocked: presets stay in-session only.
    }
  }
}

export function createPreset(name: string, bikeId: string, selection: TuneSelection): Preset {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, name: name.trim(), bikeId, selection, savedAt: new Date().toISOString() };
}

export function defaultPresetRepository(): PresetRepository {
  try {
    return new LocalStoragePresetRepository(globalThis.localStorage);
  } catch {
    return new InMemoryPresetRepository();
  }
}

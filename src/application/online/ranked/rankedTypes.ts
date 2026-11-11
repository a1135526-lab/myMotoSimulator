import { getBike } from '@/data';
import { RANKED_BIKES, RANKED_CIRCUITS, RANKED_ITEM_CIRCUITS, type RankedGroup } from '@/domain';
import type { RoomProfile } from '../room/roomStore';

export type RankedPhase = 'idle' | 'queue' | 'joining' | 'room' | 'ai';

export interface RankedMatch {
  /** The same for everyone in it, so each player's report counts once. */
  readonly id: string;
  readonly kind: 'room' | 'ai';
  readonly group: RankedGroup;
  readonly circuitId: string;
  readonly laps: number;
  /** Players who were matched (room races). */
  readonly size: number;
  /** Against the AI: your tier when it started (sets how good the AI is, for the whole race). */
  readonly aiTier?: number;
  /** Item ranked: an item race, on its own ladder. */
  readonly items?: boolean;
}

export interface RankedRecord {
  readonly points: number;
  readonly games: number;
  readonly wins: number;
  readonly best: number;
}

export type RankedResult =
  | { readonly state: 'sending' }
  | {
      readonly state: 'done';
      readonly before: number;
      readonly points: number;
      readonly delta: number;
      readonly vsAi: boolean;
    }
  | { readonly state: 'error'; readonly error: string };

/** The stock bike everyone in the group rides, as the room knows you. */
export function rankedProfile(group: RankedGroup, name: string): RoomProfile {
  const bike = getBike(RANKED_BIKES[group]);
  return {
    name,
    bike: `${bike.brand} ${bike.model}`,
    manual: bike.kind === 'manual',
    cylinders: bike.engine.cylinders,
    accountName: name,
  };
}

export function randomCircuit(items = false): string {
  const pool: readonly string[] = items ? RANKED_ITEM_CIRCUITS : RANKED_CIRCUITS;
  return pool[Math.floor(Math.random() * pool.length)] ?? 'practice-park';
}

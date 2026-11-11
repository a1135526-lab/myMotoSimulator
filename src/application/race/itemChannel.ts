import type { ItemEvent, ItemRaceState, ItemUse } from '@/domain';

/**
 * Where an item race's news goes: listeners hear each happening once (HUD,
 * sounds, the other players), and your own uses go out to a friend room.
 */
export class ItemChannel {
  /** Your id in a friend room (names what you put on the track). */
  owner = 'L';
  private send: (use: ItemUse) => void = () => undefined;
  private seq = 0;
  private readonly listeners = new Set<(events: readonly ItemEvent[]) => void>();

  link(owner: string, send: (use: ItemUse) => void): void {
    this.owner = owner;
    this.send = send;
  }

  listen(listener: (events: readonly ItemEvent[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  sent(use: ItemUse): void {
    this.send(use);
  }

  /** A new race starts counting from zero. */
  restart(): void {
    this.seq = 0;
  }

  /** Pass on whatever happened since last time. */
  flush(items: ItemRaceState | null): void {
    if (!items || items.eventSeq <= this.seq) return;
    const fresh = items.events.filter((e) => e.seq > this.seq);
    this.seq = items.eventSeq;
    for (const listener of this.listeners) listener(fresh);
  }
}

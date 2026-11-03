import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { parseMessage, parsePlayer, type RoomMessage, type RoomPlayer } from './roomTypes';

export interface RoomHandlers {
  message(msg: RoomMessage): void;
  /** Everyone in the room right now, including you. */
  presence(players: RoomPlayer[]): void;
}

/** How the room talks: Supabase Realtime in the game, a fake in tests. */
export interface RoomTransport {
  /** Resolves true once in the room and announced; false if it couldn't connect. */
  connect(code: string, me: RoomPlayer, handlers: RoomHandlers): Promise<boolean>;
  send(msg: RoomMessage): void;
  /** Update what the room knows about you (e.g. a new bike). */
  announce(me: RoomPlayer): void;
  leave(): void;
}

const EVENT = 'msg';

/** Rooms over Supabase Realtime: broadcast for messages, presence for who's in. */
export class SupabaseRoomTransport implements RoomTransport {
  private channel: RealtimeChannel | null = null;

  connect(code: string, me: RoomPlayer, handlers: RoomHandlers): Promise<boolean> {
    const client = supabase;
    if (!client) return Promise.resolve(false);
    const channel = client.channel(`room:${code}`, {
      config: { broadcast: { self: false }, presence: { key: me.id } },
    });
    this.channel = channel;
    channel.on('broadcast', { event: EVENT }, ({ payload }) => {
      const msg = parseMessage(payload);
      if (msg) handlers.message(msg);
    });
    channel.on('presence', { event: 'sync' }, () => {
      const seen = new Map<string, RoomPlayer>();
      for (const entries of Object.values(channel.presenceState())) {
        for (const entry of entries) {
          const p = parsePlayer(entry);
          if (p) seen.set(p.id, p);
        }
      }
      handlers.presence([...seen.values()]);
    });
    return new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track(me).then(() => resolve(true));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resolve(false);
        }
      });
    });
  }

  send(msg: RoomMessage): void {
    void this.channel?.send({ type: 'broadcast', event: EVENT, payload: msg });
  }

  announce(me: RoomPlayer): void {
    void this.channel?.track(me);
  }

  leave(): void {
    const channel = this.channel;
    this.channel = null;
    if (channel) void supabase?.removeChannel(channel);
  }
}

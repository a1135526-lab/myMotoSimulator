import { useEffect } from 'react';
import type { ItemUse } from '@/domain';
import type { CircuitController } from '../../race/CircuitController';
import { useRoomStore } from './roomStore';
import { sendToRoom, tapRoomMessages } from './roomTransport';
import type { RoomMessage } from './roomTypes';

/**
 * Items in a friend room (and ranked). Each device rides its own bike and only
 * judges hits on it: your uses go out so everyone makes the same trap or
 * shot, and when one of theirs gets you, the others are told to drop it.
 */
function racing(): { readonly me: string; readonly raceId: number } | null {
  const { status, me, race } = useRoomStore.getState();
  return status === 'racing' && me && race ? { me: me.id, raceId: race.raceId } : null;
}

/** Only plain values go out (a paper plane at another player names them by id). */
const outgoing = (use: ItemUse): ItemUse => ({
  ...use,
  target: typeof use.target === 'string' ? use.target : null,
});

export function receiveItem(controller: CircuitController, msg: RoomMessage): void {
  if (msg.type !== 'itemUse' && msg.type !== 'itemHit') return;
  const now = racing();
  if (!now || msg.id === now.me || msg.raceId !== now.raceId) return;
  if (msg.type === 'itemUse') {
    controller.applyRemoteItem(msg.id, msg.use, now.me);
  } else {
    controller.removeItemObject(msg.objectId);
  }
}

export function useRoomItems(controller: CircuitController, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const me = useRoomStore.getState().me?.id ?? 'L';
    controller.setItemLink(me, (use) => {
      const now = racing();
      if (now) sendToRoom({ type: 'itemUse', id: now.me, raceId: now.raceId, use: outgoing(use) });
    });
    const offHits = controller.onItemEvents((events) => {
      const now = racing();
      if (!now) return;
      for (const e of events) {
        // Something of another player's got you: it's gone for everyone.
        if (e.type === 'hit' && e.rider === 0 && typeof e.by === 'string' && e.objectId) {
          sendToRoom({ type: 'itemHit', id: now.me, raceId: now.raceId, objectId: e.objectId });
        }
      }
    });
    const offMessages = tapRoomMessages((msg) => receiveItem(controller, msg));
    return () => {
      offHits();
      offMessages();
      controller.setItemLink('L', () => undefined);
    };
  }, [controller, enabled]);
}

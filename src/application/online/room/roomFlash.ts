import { useCircuitStore } from '../../stores/circuitStore';
import { useFlashStore } from '../../stores/flashStore';
import { remoteRiders, useRoomStore } from './roomStore';
import { sendToRoom, tapRoomMessages } from './roomTransport';
import type { RoomMessage } from './roomTypes';

/**
 * Headlight flashes in a friend room (and ranked): yours goes out when you
 * flash; when someone just behind flashes, your screen whites out a moment.
 */

/** A flash reaches a rider this far ahead, m. */
export const FLASH_RANGE_M = 70;
/** …and only within this cone either side of the flasher's heading. */
const FLASH_CONE_COS = Math.cos((40 * Math.PI) / 180);

interface Pose {
  readonly x: number;
  readonly z: number;
}

/** Does a flash from `from` (heading of travel) light up a rider at `me`? */
export function dazzles(from: Pose & { readonly heading: number }, me: Pose): boolean {
  const dx = me.x - from.x;
  const dz = me.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist > FLASH_RANGE_M || dist < 1e-3) return false;
  const ahead = (dx * Math.cos(from.heading) + dz * Math.sin(from.heading)) / dist;
  return ahead >= FLASH_CONE_COS;
}

export function receiveFlash(msg: RoomMessage): void {
  if (msg.type !== 'flash') return;
  const room = useRoomStore.getState();
  if (room.race?.raceId !== msg.raceId || msg.id === room.me?.id) return;
  const player = room.players.find((p) => p.id === msg.id);
  const me = useCircuitStore.getState().view?.riders[0];
  if (!player || !me) return;
  const [them] = remoteRiders.sample([player], performance.now());
  if (them && dazzles(them.pose, me)) useFlashStore.getState().dazzle();
}

tapRoomMessages(receiveFlash);

useFlashStore.subscribe((s, prev) => {
  if (s.flashedAt === prev.flashedAt || s.flashedAt === null) return;
  const { status, me, race } = useRoomStore.getState();
  if (status === 'racing' && me && race) {
    sendToRoom({ type: 'flash', id: me.id, raceId: race.raceId });
  }
});

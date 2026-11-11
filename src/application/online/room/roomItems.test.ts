import { describe, expect, it, vi } from 'vitest';
import type { CircuitController } from '../../race/CircuitController';
import { FakeHub } from './fakeRoom';
import { parseMessage } from './roomTypes';

const profile = (name: string) => ({ name, bike: 'SYM JET SL 125', manual: false, cylinders: 1 });
const OIL = { item: 'oil', objectId: 'a:1', s: 120, d: 1.5, speedMps: 20, target: null };

async function racingGuest() {
  vi.resetModules();
  const hub = new FakeHub();
  let t = 1000;
  const deps = { transport: () => hub.transport(), random: () => 0.5, now: () => ++t };
  const host = await import('./roomStore');
  host.setRoomDeps(deps);
  await host.useRoomStore.getState().create(profile('阿明'), { circuitId: 'hill-town', laps: 1 });
  vi.resetModules();
  const guest = await import('./roomStore');
  guest.setRoomDeps(deps);
  await guest.useRoomStore
    .getState()
    .join(host.useRoomStore.getState().code ?? '', profile('小華'));
  host.useRoomStore.getState().startRace();
  const items = await import('./roomItems');
  return { host, guest, items };
}

const fakeController = () => {
  const c = { applyRemoteItem: vi.fn(), removeItemObject: vi.fn() };
  return { c, controller: c as unknown as CircuitController };
};

describe('items in a friend room', () => {
  it('item messages are checked like the rest', () => {
    expect(parseMessage({ type: 'itemUse', id: 'a', raceId: 1, use: OIL })).toEqual({
      type: 'itemUse',
      id: 'a',
      raceId: 1,
      use: OIL,
    });
    expect(
      parseMessage({ type: 'itemUse', id: 'a', raceId: 1, use: { ...OIL, item: 'rocket' } }),
    ).toBeNull();
    expect(
      parseMessage({ type: 'itemUse', id: 'a', raceId: 1, use: { ...OIL, speedMps: 9e9 } }),
    ).toBeNull();
    expect(parseMessage({ type: 'itemHit', id: 'a', raceId: 1, objectId: '' })).toBeNull();
  });

  it("another player's trap is laid here, and dropped when someone runs into it", async () => {
    const { host, guest, items } = await racingGuest();
    const { c, controller } = fakeController();
    const hostId = host.useRoomStore.getState().me?.id ?? '';
    const raceId = guest.useRoomStore.getState().race?.raceId ?? -1;
    const guestId = guest.useRoomStore.getState().me?.id ?? '';
    items.receiveItem(controller, { type: 'itemUse', id: hostId, raceId, use: OIL as never });
    expect(c.applyRemoteItem).toHaveBeenCalledWith(hostId, OIL, guestId);
    items.receiveItem(controller, { type: 'itemHit', id: hostId, raceId, objectId: 'a:1' });
    expect(c.removeItemObject).toHaveBeenCalledWith('a:1');
  });

  it('your own echoes and other races are ignored', async () => {
    const { guest, items } = await racingGuest();
    const { c, controller } = fakeController();
    const me = guest.useRoomStore.getState().me?.id ?? '';
    const raceId = guest.useRoomStore.getState().race?.raceId ?? -1;
    items.receiveItem(controller, { type: 'itemUse', id: me, raceId, use: OIL as never });
    items.receiveItem(controller, {
      type: 'itemUse',
      id: 'someone',
      raceId: raceId + 1,
      use: OIL as never,
    });
    expect(c.applyRemoteItem).not.toHaveBeenCalled();
  });
});

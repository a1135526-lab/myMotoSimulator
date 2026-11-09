import { describe, expect, it, vi } from 'vitest';
import { FakeHub } from './fakeRoom';
import { parseMessage } from './roomTypes';

/** A separate copy of the room, horn and remote-horn stores per player, on one fake connection. */
async function player(hub: FakeHub, clock: { t: number }) {
  vi.resetModules();
  const room = await import('./roomStore');
  const horns = await import('./roomHorns');
  const { useHornStore } = await import('../../stores/hornStore');
  room.setRoomDeps({ transport: () => hub.transport(), random: () => 0.5, now: () => ++clock.t });
  return { ...room, ...horns, useHornStore };
}

const profile = (name: string) => ({ name, bike: 'SYM JET SL 125', manual: false, cylinders: 1 });
const CLIP = 'data:audio/webm;base64,AAAA';

describe('horns in a friend room', () => {
  it('your horn reaches the others while racing, recording first', async () => {
    const hub = new FakeHub();
    const clock = { t: 1000 };
    const host = await player(hub, clock);
    await host.useRoomStore.getState().create(profile('阿明'), { circuitId: 'hill-town', laps: 1 });
    const guest = await player(hub, clock);
    await guest.useRoomStore
      .getState()
      .join(host.useRoomStore.getState().code ?? '', profile('小華'));
    const hostId = host.useRoomStore.getState().me?.id ?? '';

    // In the lobby nothing goes out.
    host.useHornStore.getState().setHeld(true);
    host.useHornStore.getState().setHeld(false);
    expect(guest.useRemoteHornStore.getState().horns[hostId]).toBeUndefined();

    host.useRoomStore.getState().startRace();
    host.useHornStore.getState().setClip(CLIP);
    host.useHornStore.getState().setHeld(true);
    expect(guest.useRemoteHornStore.getState().horns[hostId]).toEqual({
      on: true,
      preset: 'custom',
      clip: CLIP,
    });
    host.useHornStore.getState().setHeld(false);
    expect(guest.useRemoteHornStore.getState().horns[hostId]?.on).toBe(false);
  });

  it('horn messages are checked like the rest', () => {
    expect(parseMessage({ type: 'horn', id: 'a', raceId: 1, on: true, preset: 'truck' })).toEqual({
      type: 'horn',
      id: 'a',
      raceId: 1,
      on: true,
      preset: 'truck',
    });
    expect(
      parseMessage({ type: 'horn', id: 'a', raceId: 1, on: true, preset: 'siren' }),
    ).toBeNull();
    expect(parseMessage({ type: 'hornClip', id: 'a', clip: 'javascript:alert(1)' })).toBeNull();
    expect(
      parseMessage({ type: 'hornClip', id: 'a', clip: 'data:audio/' + 'A'.repeat(300_000) }),
    ).toBeNull();
  });
});

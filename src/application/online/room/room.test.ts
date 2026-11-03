import { describe, expect, it, vi } from 'vitest';
import type { CircuitRiderView, CircuitView } from '../../viewModels/circuit';
import { FakeHub } from './fakeRoom';
import { INTERP_DELAY_MS, RemoteTrack } from './remoteRiders';
import { newRoomCode, normalizeRoomCode, parseMessage, type PosePayload } from './roomTypes';
import { withRemoteRiders } from './withRemoteRiders';

/** A separate copy of the room store per player, all on one fake connection. */
async function player(hub: FakeHub, clock: { t: number }, seed = 0.5) {
  vi.resetModules();
  const mod = await import('./roomStore');
  mod.setRoomDeps({ transport: () => hub.transport(), random: () => seed, now: () => ++clock.t });
  return mod;
}

const profile = (name: string) => ({ name, bike: 'SYM JET SL 125', manual: false, cylinders: 1 });
const settings = { circuitId: 'hill-town', laps: 2 };
const pose = (progressM: number): PosePayload => ({
  x: progressM,
  z: 0,
  heading: 0,
  lean: 0,
  speedKmh: 80,
  rpm: 8000,
  progressM,
  crashed: false,
  bestLapS: null,
  finishTimeS: null,
});

describe('friend room', () => {
  it('host makes a room, a friend joins with the code, both see each other', async () => {
    const hub = new FakeHub();
    const clock = { t: 1000 };
    const host = await player(hub, clock);
    await host.useRoomStore.getState().create(profile('阿明'), settings);
    const code = host.useRoomStore.getState().code ?? '';
    expect(code).toHaveLength(5);

    const guest = await player(hub, clock);
    await guest.useRoomStore.getState().join(code.toLowerCase(), profile('小華'));
    const g = guest.useRoomStore.getState();
    expect(g.status).toBe('lobby');
    expect(g.players.map((p) => p.name)).toEqual(['阿明', '小華']);
    // The host told the newcomer what's set.
    expect(g.settings).toEqual(settings);

    // Host changes the circuit; the guest follows. A guest can't change it.
    host.useRoomStore.getState().setSettings({ circuitId: 'south-bay', laps: 3 });
    expect(guest.useRoomStore.getState().settings.circuitId).toBe('south-bay');
    guest.useRoomStore.getState().setSettings({ circuitId: 'practice-park', laps: 1 });
    expect(host.useRoomStore.getState().settings.circuitId).toBe('south-bay');
  });

  it('the start reaches everyone with the same lights hold; poses and finishes flow', async () => {
    const hub = new FakeHub();
    const clock = { t: 1000 };
    const host = await player(hub, clock, 0.25);
    await host.useRoomStore.getState().create(profile('阿明'), settings);
    const guest = await player(hub, clock, 0.9);
    const code = host.useRoomStore.getState().code ?? '';
    await guest.useRoomStore.getState().join(code, profile('小華'));

    guest.useRoomStore.getState().startRace(); // not the host: ignored
    expect(host.useRoomStore.getState().status).toBe('lobby');
    host.useRoomStore.getState().startRace();
    const h = host.useRoomStore.getState();
    const g = guest.useRoomStore.getState();
    expect(g.status).toBe('racing');
    expect(g.race).toEqual(h.race);

    guest.useRoomStore.getState().sendPose(pose(120));
    const hostId = h.me?.id ?? '';
    const seen = host.remoteRiders.sample(
      h.players.filter((p) => p.id !== hostId),
      performance.now() + INTERP_DELAY_MS,
    );
    expect(seen[0]?.pose.progressM).toBe(120);

    guest.useRoomStore.getState().sendFinish(95.5, 47.1);
    const guestId = g.me?.id ?? '';
    expect(host.useRoomStore.getState().finishes[guestId]).toEqual({
      timeS: 95.5,
      bestLapS: 47.1,
    });

    host.useRoomStore.getState().backToLobby();
    expect(guest.useRoomStore.getState().status).toBe('lobby');
  });

  it('a wrong code finds no room; a fifth player finds it full', async () => {
    vi.useFakeTimers();
    try {
      const hub = new FakeHub();
      const clock = { t: 1000 };
      const lost = await player(hub, clock);
      const joining = lost.useRoomStore.getState().join('ZZZZZ', profile('路人'));
      await vi.advanceTimersByTimeAsync(5000);
      await joining;
      expect(lost.useRoomStore.getState().status).toBe('idle');
      expect(lost.useRoomStore.getState().error).toContain('找不到房間');

      const host = await player(hub, clock);
      await host.useRoomStore.getState().create(profile('房主'), settings);
      const code = host.useRoomStore.getState().code ?? '';
      for (const name of ['二', '三', '四']) {
        const p = await player(hub, clock);
        await p.useRoomStore.getState().join(code, profile(name));
      }
      const fifth = await player(hub, clock);
      await fifth.useRoomStore.getState().join(code, profile('五'));
      expect(fifth.useRoomStore.getState().error).toContain('滿');
      expect(host.useRoomStore.getState().players).toHaveLength(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it('when the host leaves, the next player to have joined takes over', async () => {
    const hub = new FakeHub();
    const clock = { t: 1000 };
    const host = await player(hub, clock);
    await host.useRoomStore.getState().create(profile('阿明'), settings);
    const guest = await player(hub, clock);
    const code = host.useRoomStore.getState().code ?? '';
    await guest.useRoomStore.getState().join(code, profile('小華'));
    host.useRoomStore.getState().leave();
    expect(guest.amHost()).toBe(true);
  });
});

describe('room messages and codes', () => {
  it('drops anything malformed from other players', () => {
    expect(parseMessage({ type: 'pose', id: 'a', raceId: 1, pose: pose(1) })).not.toBeNull();
    expect(parseMessage({ type: 'pose', id: 'a', raceId: 1, pose: { x: 'far' } })).toBeNull();
    expect(parseMessage({ type: 'start', raceId: 1, settings, holdS: 99 })).toBeNull();
    expect(parseMessage({ type: 'hack' })).toBeNull();
    expect(parseMessage('nope')).toBeNull();
  });

  it('codes are five easy characters', () => {
    expect(newRoomCode(() => 0)).toBe('AAAAA');
    expect(normalizeRoomCode(' k7q2m ')).toBe('K7Q2M');
    expect(normalizeRoomCode('K7Q2O')).toBeNull(); // no O
    expect(normalizeRoomCode('ABC')).toBeNull();
  });
});

describe('remote bikes', () => {
  it('are drawn a little in the past, eased between poses', () => {
    const track = new RemoteTrack();
    track.push(1000, pose(0));
    track.push(1100, pose(10));
    expect(track.poseAt(1050 + INTERP_DELAY_MS)?.progressM).toBeCloseTo(5);
    expect(track.poseAt(5000)?.progressM).toBe(10);
  });

  it('join the standings: finishers by time, then by distance; names kept apart', () => {
    const me = { name: '阿明', isPlayer: true, progressM: 500, finishTimeS: null, position: 1 };
    // Only the riders matter here.
    const view = { riders: [me as CircuitRiderView] } as unknown as CircuitView;
    const remote = (id: string, name: string) => ({
      id,
      name,
      bike: 'X',
      manual: false,
      cylinders: 1,
      joinedAt: 0,
    });
    const merged = withRemoteRiders(
      view,
      [
        { player: remote('b', '阿明'), pose: pose(800) },
        { player: remote('c', '小華'), pose: pose(100) },
      ],
      { c: { timeS: 90, bestLapS: 44 } },
    );
    const byName = Object.fromEntries(merged.riders.map((r) => [r.name, r.position]));
    expect(byName).toEqual({ 阿明: 3, '阿明 2': 2, 小華: 1 });
    expect(merged.riders[1]?.remote).toBe(true);
  });
});

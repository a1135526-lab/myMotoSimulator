import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchStats } from './matchStats';
import { parseMatch, type MatchRecord } from './matchTypes';

let t = 0;
const match = (patch: Partial<MatchRecord> = {}): MatchRecord => ({
  id: `m${++t}`,
  at: t * 1000,
  kind: 'circuit',
  trackId: 'practice-park',
  trackName: '練習場',
  laps: 2,
  bike: 'SYM JET SL 125',
  manual: false,
  position: 1,
  field: 3,
  won: true,
  dnf: false,
  timeS: 120,
  bestLapS: 59,
  riders: [],
  ...patch,
});

const loss = (patch: Partial<MatchRecord> = {}) => match({ position: 2, won: false, ...patch });

describe('matchStats', () => {
  it('totals, rates, podiums and finishing', () => {
    const s = matchStats([
      match(),
      loss(),
      loss({ position: 4, field: 4 }),
      match({ kind: 'room', position: 3, won: false, dnf: true, timeS: null }),
    ]);
    expect(s.all).toEqual({ played: 4, won: 1, rate: 0.25 });
    expect(s.podiums).toBe(2); // the DNF's place doesn't count
    expect(s.dnfs).toBe(1);
    expect(s.finishRate).toBe(0.75);
    expect(s.avgPosition).toBe(2.5);
    expect(s.byKind.room.played).toBe(1);
    expect(s.byKind.circuit).toEqual({ played: 3, won: 1, rate: 1 / 3 });
    expect(s.raceTimeS).toBe(360);
  });

  it('win streaks: the current run and the best ever', () => {
    const s = matchStats([match(), match(), match(), loss(), match(), match()]);
    expect(s.bestStreak).toBe(3);
    expect(s.currentStreak).toBe(2);
    expect(matchStats([match(), loss()]).currentStreak).toBe(0);
  });

  it('bikes most raced first, tracks with their best time', () => {
    const s = matchStats([
      match({ bike: 'Ninja 400', timeS: 100 }),
      loss({ bike: 'Ninja 400', timeS: 95 }),
      match({ bike: 'JET SL' }),
      match({ kind: 'drag', trackId: 'central-speedway', trackName: '中央賽車場', timeS: 15.2 }),
    ]);
    expect(s.bikes[0]).toEqual({ bike: 'Ninja 400', played: 2, won: 1, rate: 0.5 });
    const park = s.tracks.find((x) => x.trackId === 'practice-park');
    expect(park?.bestTimeS).toBe(95);
    expect(s.tracks.find((x) => x.kind === 'drag')?.bestTimeS).toBe(15.2);
  });

  it('head to head against friends, rooms only', () => {
    const rider = (name: string, position: number, isMe = false) => ({
      name,
      bike: 'X',
      position,
      timeS: 100,
      isMe,
    });
    const s = matchStats([
      match({ kind: 'room', riders: [rider('你', 1, true), rider('小華', 2)] }),
      loss({ kind: 'room', riders: [rider('小華', 1), rider('你', 2, true)] }),
      loss({ kind: 'room', position: 3, riders: [rider('阿明', 1), rider('小華', 2)] }),
      match({ riders: [rider('AI', 2)] }), // against the AI: not a rival
    ]);
    expect(s.rivals).toEqual([
      { name: '小華', races: 3, wins: 1, losses: 2 },
      { name: '阿明', races: 1, wins: 0, losses: 1 },
    ]);
  });

  it('is empty-safe', () => {
    const s = matchStats([]);
    expect(s.all.rate).toBe(0);
    expect(s.avgPosition).toBeNull();
    expect(s.lastAt).toBeNull();
  });
});

describe('match records', () => {
  it('keep what holds together and drop the rest', () => {
    expect(parseMatch(JSON.parse(JSON.stringify(match())))).toMatchObject({ kind: 'circuit' });
    expect(parseMatch({ ...match(), kind: 'hack' })).toBeNull();
    expect(parseMatch({ ...match(), position: 0 })).toBeNull();
    expect(parseMatch('x')).toBeNull();
  });
});

describe('match store (this device)', () => {
  beforeEach(() => localStorage.clear());

  it('keeps races newest first, never twice, and remembers them', async () => {
    vi.resetModules();
    let { useMatchStore } = await import('./matchStore');
    const a = match({ at: 1 });
    const b = match({ at: 2 });
    useMatchStore.getState().addMatch(a);
    useMatchStore.getState().addMatch(b);
    useMatchStore.getState().addMatch(a);
    expect(useMatchStore.getState().matches.map((m) => m.id)).toEqual([b.id, a.id]);
    vi.resetModules();
    ({ useMatchStore } = await import('./matchStore'));
    expect(useMatchStore.getState().matches).toHaveLength(2);
    // Offline build: nothing to sync with.
    await useMatchStore.getState().syncNow();
    expect(useMatchStore.getState().sync.state).toBe('off');
  });
});

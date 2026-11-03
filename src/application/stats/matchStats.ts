import type { MatchKind, MatchRecord } from './matchTypes';

/** Played, won, and the share won (0–1; 0 when none played). */
export interface Tally {
  readonly played: number;
  readonly won: number;
  readonly rate: number;
}

export interface BikeStats extends Tally {
  readonly bike: string;
}

export interface TrackStats extends Tally {
  readonly kind: MatchKind;
  readonly trackId: string;
  readonly trackName: string;
  /** Best race time there (finished races only). */
  readonly bestTimeS: number | null;
}

/** Head to head against one friend, across the rooms you both raced in. */
export interface RivalStats {
  readonly name: string;
  readonly races: number;
  /** You finished ahead of them. */
  readonly wins: number;
  readonly losses: number;
}

export interface MatchStats {
  readonly all: Tally;
  readonly byKind: Readonly<Record<MatchKind, Tally>>;
  /** Top three finishes. */
  readonly podiums: number;
  readonly dnfs: number;
  /** Share of races you finished (0–1). */
  readonly finishRate: number;
  /** Average place, finished or not. */
  readonly avgPosition: number | null;
  /** Wins in a row up to the latest race. */
  readonly currentStreak: number;
  readonly bestStreak: number;
  /** Time spent racing, finished races, s. */
  readonly raceTimeS: number;
  /** Most raced first. */
  readonly bikes: readonly BikeStats[];
  readonly tracks: readonly TrackStats[];
  readonly rivals: readonly RivalStats[];
  readonly lastAt: number | null;
}

const tally = (played: number, won: number): Tally => ({
  played,
  won,
  rate: played ? won / played : 0,
});

function group<K extends string>(records: readonly MatchRecord[], key: (m: MatchRecord) => K) {
  const groups = new Map<K, MatchRecord[]>();
  for (const m of records) {
    const k = key(m);
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return groups;
}

const wins = (ms: readonly MatchRecord[]) => ms.filter((m) => m.won).length;

function streaks(records: readonly MatchRecord[]) {
  const ordered = [...records].sort((a, b) => a.at - b.at);
  let best = 0;
  let run = 0;
  for (const m of ordered) {
    run = m.won ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

function rivals(records: readonly MatchRecord[]): RivalStats[] {
  const byName = new Map<string, { races: number; wins: number; losses: number }>();
  for (const m of records) {
    if (m.kind !== 'room') continue;
    for (const r of m.riders) {
      if (r.isMe) continue;
      const s = byName.get(r.name) ?? { races: 0, wins: 0, losses: 0 };
      s.races += 1;
      if (m.position < r.position) s.wins += 1;
      else if (m.position > r.position) s.losses += 1;
      byName.set(r.name, s);
    }
  }
  return [...byName.entries()]
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.races - a.races || b.wins - a.wins);
}

/** Everything the profile shows, worked out from the match history. */
export function matchStats(records: readonly MatchRecord[]): MatchStats {
  const kinds: MatchKind[] = ['room', 'circuit', 'drag'];
  const byKind = Object.fromEntries(
    kinds.map((k) => {
      const ms = records.filter((m) => m.kind === k);
      return [k, tally(ms.length, wins(ms))];
    }),
  ) as Record<MatchKind, Tally>;
  const finished = records.filter((m) => !m.dnf && m.timeS !== null);
  const { current, best } = streaks(records);

  const bikes = [...group(records, (m) => m.bike).entries()]
    .map(([bike, ms]) => ({ bike, ...tally(ms.length, wins(ms)) }))
    .sort((a, b) => b.played - a.played || b.won - a.won);

  const tracks = [...group(records, (m) => `${m.kind}:${m.trackId}`).values()]
    .map((ms) => {
      const first = ms[0] as MatchRecord;
      const times = ms.flatMap((m) => (m.dnf || m.timeS === null ? [] : [m.timeS]));
      return {
        kind: first.kind,
        trackId: first.trackId,
        trackName: first.trackName,
        ...tally(ms.length, wins(ms)),
        bestTimeS: times.length ? Math.min(...times) : null,
      };
    })
    .sort((a, b) => b.played - a.played);

  return {
    all: tally(records.length, wins(records)),
    byKind,
    podiums: records.filter((m) => !m.dnf && m.position <= 3).length,
    dnfs: records.filter((m) => m.dnf).length,
    finishRate: records.length ? finished.length / records.length : 0,
    avgPosition: records.length
      ? records.reduce((sum, m) => sum + m.position, 0) / records.length
      : null,
    currentStreak: current,
    bestStreak: best,
    raceTimeS: finished.reduce((sum, m) => sum + (m.timeS ?? 0), 0),
    bikes,
    tracks,
    rivals: rivals(records),
    lastAt: records.length ? Math.max(...records.map((m) => m.at)) : null,
  };
}

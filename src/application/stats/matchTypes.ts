/**
 * One race you took part in — against friends in a room, or against the AI
 * on a circuit or drag strip — as kept in your match history.
 */

export type MatchKind = 'room' | 'circuit' | 'drag' | 'ranked';

export const MATCH_KIND_LABELS: Readonly<Record<MatchKind, string>> = {
  room: '好友對戰',
  ranked: '排位賽',
  circuit: '賽道（對 AI）',
  drag: '直線加速（對 AI）',
};

export interface MatchRider {
  /** Player name (rooms) or the AI's bike. */
  readonly name: string;
  readonly bike: string;
  readonly position: number;
  /** Race time at the flag; null = did not finish. */
  readonly timeS: number | null;
  readonly isMe: boolean;
  /** Their account, if they were signed in: to look them up or add them as a friend. */
  readonly accountName?: string;
}

export interface MatchRecord {
  /** Unique, so a match synced from another device is never counted twice. */
  readonly id: string;
  /** When it finished, ms since 1970. */
  readonly at: number;
  readonly kind: MatchKind;
  /** Circuit or drag strip id. */
  readonly trackId: string;
  readonly trackName: string;
  /** Laps (circuit / room); distance in m for drag. */
  readonly laps: number;
  readonly bike: string;
  readonly manual: boolean;
  /** Your place, 1 = won. */
  readonly position: number;
  /** How many raced, you included. */
  readonly field: number;
  readonly won: boolean;
  /** Didn't make the flag in time (room) or jumped the start (drag). */
  readonly dnf: boolean;
  /** Your race time; null when you didn't finish. */
  readonly timeS: number | null;
  readonly bestLapS: number | null;
  readonly riders: readonly MatchRider[];
}

// ---- Checking stored / synced records ----

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown, max = 80): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const numOrNull = (v: unknown): number | null => (isNum(v) ? v : null);

function parseRider(raw: unknown): MatchRider | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isStr(r.name, 40) || !isStr(r.bike) || !isNum(r.position)) return null;
  return {
    name: r.name,
    bike: r.bike,
    position: r.position,
    timeS: numOrNull(r.timeS),
    isMe: r.isMe === true,
    ...(isStr(r.accountName, 40) && { accountName: r.accountName }),
  };
}

/** A record as stored or downloaded, if it holds together; else null. */
export function parseMatch(raw: unknown): MatchRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (m.kind !== 'room' && m.kind !== 'circuit' && m.kind !== 'drag' && m.kind !== 'ranked') {
    return null;
  }
  if (!isStr(m.id, 64) || !isNum(m.at) || !isStr(m.trackId, 40) || !isStr(m.bike)) return null;
  if (!isNum(m.position) || !isNum(m.field) || m.position < 1 || m.field < 1) return null;
  const riders = Array.isArray(m.riders)
    ? m.riders.slice(0, 8).flatMap((r) => parseRider(r) ?? [])
    : [];
  return {
    id: m.id,
    at: m.at,
    kind: m.kind,
    trackId: m.trackId,
    trackName: isStr(m.trackName, 40) ? m.trackName : m.trackId,
    laps: isNum(m.laps) ? m.laps : 1,
    bike: m.bike,
    manual: m.manual === true,
    position: m.position,
    field: m.field,
    won: m.won === true,
    dnf: m.dnf === true,
    timeS: numOrNull(m.timeS),
    bestLapS: numOrNull(m.bestLapS),
    riders,
  };
}

export const newMatchId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `m${Date.now()}${Math.floor(Math.random() * 1e9)}`;

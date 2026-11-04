/**
 * Friend rooms: up to four players racing one circuit together. Each runs
 * their own physics; the room only passes along who's in, the host's
 * settings, the start, everyone's position and their finish.
 */

export const MAX_ROOM_PLAYERS = 4;
export const NAME_MAX = 16;

/** A player as the room's presence list knows them. */
export interface RoomPlayer {
  readonly id: string;
  readonly name: string;
  /** "Brand Model". */
  readonly bike: string;
  readonly manual: boolean;
  readonly cylinders: number;
  /** When they joined, ms; the earliest one in the room is the host. */
  readonly joinedAt: number;
  /** Their account nickname when signed in (to add them as a friend). */
  readonly accountName?: string;
}

export interface RoomSettings {
  readonly circuitId: string;
  readonly laps: number;
  /** A ranked match: everyone rides this group's stock bike, no assists. */
  readonly ranked?: 'scooter' | 'manual';
}

/** Where a rider is, ~10 times a second while racing. */
export interface PosePayload {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly lean: number;
  readonly speedKmh: number;
  readonly rpm: number;
  /** Distance along the race so far, m (comparable between players). */
  readonly progressM: number;
  readonly crashed: boolean;
  readonly bestLapS: number | null;
  readonly finishTimeS: number | null;
}

export type RoomMessage =
  /** Host → all: what's set, and whether a race is running (for latecomers). */
  | { readonly type: 'settings'; readonly settings: RoomSettings; readonly racing: boolean }
  /** Host → all: lights on now, with the same random hold for everyone. */
  | {
      readonly type: 'start';
      readonly raceId: number;
      readonly settings: RoomSettings;
      readonly holdS: number;
    }
  | {
      readonly type: 'pose';
      readonly id: string;
      readonly raceId: number;
      readonly pose: PosePayload;
    }
  | {
      readonly type: 'finish';
      readonly id: string;
      readonly raceId: number;
      readonly timeS: number;
      readonly bestLapS: number | null;
    }
  /** Someone at the results wants another race. */
  | { readonly type: 'again'; readonly id: string; readonly raceId: number }
  /** Host → all: race over, back to the lobby. */
  | { readonly type: 'lobby' };

// ---- Checking what other players send: never trust it as-is ----

const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : null;
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

const BIG = 1e6;

export function parsePlayer(raw: unknown): RoomPlayer | null {
  const o = obj(raw);
  if (!o) return null;
  const id = str(o.id, 64);
  const name = str(o.name, NAME_MAX);
  const bike = str(o.bike, 60);
  const cylinders = num(o.cylinders, 1, 16);
  const joinedAt = num(o.joinedAt, 0, Number.MAX_SAFE_INTEGER);
  if (!id || !name || !bike || cylinders === null || joinedAt === null) return null;
  const accountName = str(o.accountName, NAME_MAX) ?? undefined;
  return {
    id,
    name,
    bike,
    manual: o.manual === true,
    cylinders,
    joinedAt,
    ...(accountName && { accountName }),
  };
}

function parseSettings(raw: unknown): RoomSettings | null {
  const o = obj(raw);
  const circuitId = str(o?.circuitId, 40);
  const laps = num(o?.laps, 1, 20);
  if (!circuitId || laps === null) return null;
  const ranked = o?.ranked === 'scooter' || o?.ranked === 'manual' ? o.ranked : undefined;
  return { circuitId, laps: Math.round(laps), ...(ranked && { ranked }) };
}

function parsePose(raw: unknown): PosePayload | null {
  const o = obj(raw);
  if (!o) return null;
  const x = num(o.x, -BIG, BIG);
  const z = num(o.z, -BIG, BIG);
  const heading = num(o.heading, -100, 100);
  const lean = num(o.lean, -2, 2);
  const speedKmh = num(o.speedKmh, 0, 500);
  const rpm = num(o.rpm, 0, 30000);
  const progressM = num(o.progressM, -BIG, BIG);
  if ([x, z, heading, lean, speedKmh, rpm, progressM].some((v) => v === null)) return null;
  return {
    x: x as number,
    z: z as number,
    heading: heading as number,
    lean: lean as number,
    speedKmh: speedKmh as number,
    rpm: rpm as number,
    progressM: progressM as number,
    crashed: o.crashed === true,
    bestLapS: num(o.bestLapS, 0, BIG),
    finishTimeS: num(o.finishTimeS, 0, BIG),
  };
}

export function parseMessage(raw: unknown): RoomMessage | null {
  const o = obj(raw);
  if (!o) return null;
  switch (o.type) {
    case 'settings': {
      const settings = parseSettings(o.settings);
      return settings ? { type: 'settings', settings, racing: o.racing === true } : null;
    }
    case 'start': {
      const settings = parseSettings(o.settings);
      const raceId = num(o.raceId, 0, Number.MAX_SAFE_INTEGER);
      const holdS = num(o.holdS, 0, 5);
      return settings && raceId !== null && holdS !== null
        ? { type: 'start', raceId, settings, holdS }
        : null;
    }
    case 'pose': {
      const id = str(o.id, 64);
      const raceId = num(o.raceId, 0, Number.MAX_SAFE_INTEGER);
      const pose = parsePose(o.pose);
      return id && raceId !== null && pose ? { type: 'pose', id, raceId, pose } : null;
    }
    case 'finish': {
      const id = str(o.id, 64);
      const raceId = num(o.raceId, 0, Number.MAX_SAFE_INTEGER);
      const timeS = num(o.timeS, 0, BIG);
      return id && raceId !== null && timeS !== null
        ? { type: 'finish', id, raceId, timeS, bestLapS: num(o.bestLapS, 0, BIG) }
        : null;
    }
    case 'again': {
      const id = str(o.id, 64);
      const raceId = num(o.raceId, 0, Number.MAX_SAFE_INTEGER);
      return id && raceId !== null ? { type: 'again', id, raceId } : null;
    }
    case 'lobby':
      return { type: 'lobby' };
    default:
      return null;
  }
}

// ---- Room codes ----

/** No 0/O, 1/I/L: easy to read out and type. */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export function newRoomCode(random: () => number = Math.random): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)] ?? 'A',
  ).join('');
}

/** What the player typed, cleaned up; null if it can't be a code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_CHARS.includes(c))
    ? code
    : null;
}

/**
 * Who races whom, worked out the same way on every queued player's device
 * from the same queue: the longest-waiting player leads and picks the
 * closest-ranked others, accepting a wider gap the longer they've waited.
 */

export interface QueuedPlayer {
  /** Account id. */
  readonly id: string;
  readonly points: number;
  /** When they joined the queue, ms. */
  readonly joinedAt: number;
}

/** At most this many in one race. */
export const MAX_MATCH = 4;
/** Points apart accepted straight away… */
export const START_WINDOW = 120;
/** …widening this much per second the leader has waited. */
export const WINDOW_PER_S = 15;
/** With fewer than a full grid, wait this long (s) for more before starting. */
export const FILL_WAIT_S = 8;
/** Nobody to race in this long (s): race the AI instead. */
export const QUEUE_GIVE_UP_S = 20;

const waited = (p: QueuedPlayer, now: number) => Math.max(0, (now - p.joinedAt) / 1000);

/** The player who forms the next race: the one who's waited longest (id breaks ties). */
export function queueLeader(queue: readonly QueuedPlayer[]): QueuedPlayer | null {
  return [...queue].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))[0] ?? null;
}

/** The race the leader would start now (leader first), or null to keep waiting. */
export function formMatch(queue: readonly QueuedPlayer[], now: number): QueuedPlayer[] | null {
  const leader = queueLeader(queue);
  if (!leader) return null;
  const window = START_WINDOW + WINDOW_PER_S * waited(leader, now);
  const picked = queue
    .filter((p) => p.id !== leader.id && Math.abs(p.points - leader.points) <= window)
    .sort(
      (a, b) =>
        Math.abs(a.points - leader.points) - Math.abs(b.points - leader.points) ||
        a.joinedAt - b.joinedAt,
    )
    .slice(0, MAX_MATCH - 1);
  if (picked.length === MAX_MATCH - 1) return [leader, ...picked];
  if (picked.length > 0 && waited(leader, now) >= FILL_WAIT_S) return [leader, ...picked];
  return null;
}

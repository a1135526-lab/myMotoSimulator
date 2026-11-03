import { describe, expect, it } from 'vitest';
import { FILL_WAIT_S, formMatch, queueLeader, START_WINDOW, WINDOW_PER_S } from './matchmaking';

const p = (id: string, points: number, joinedAt: number) => ({ id, points, joinedAt });

describe('matchmaking', () => {
  it('the longest-waiting player leads', () => {
    expect(queueLeader([p('b', 0, 2000), p('a', 0, 1000)])?.id).toBe('a');
    expect(queueLeader([])).toBeNull();
  });

  it('a full grid of close ranks starts at once, closest first', () => {
    const queue = [
      p('lead', 300, 0),
      p('far', 300 + START_WINDOW + 50, 10),
      p('x', 320, 20),
      p('y', 280, 30),
      p('z', 350, 40),
    ];
    expect(formMatch(queue, 1000)?.map((m) => m.id)).toEqual(['lead', 'x', 'y', 'z']);
  });

  it('a short grid waits a little for more, then goes', () => {
    const queue = [p('lead', 300, 0), p('x', 310, 100)];
    expect(formMatch(queue, (FILL_WAIT_S - 1) * 1000)).toBeNull();
    expect(formMatch(queue, FILL_WAIT_S * 1000)?.map((m) => m.id)).toEqual(['lead', 'x']);
  });

  it('the accepted rank gap widens with waiting', () => {
    // Out of reach at 8 s (window 240), within it by 10 s (270).
    const gap = START_WINDOW + 9 * WINDOW_PER_S;
    const queue = [p('lead', 0, 0), p('pro', gap, 0)];
    expect(formMatch(queue, FILL_WAIT_S * 1000)).toBeNull();
    expect(formMatch(queue, 10_000)?.map((m) => m.id)).toEqual(['lead', 'pro']);
  });

  it('alone in the queue: nobody to race', () => {
    expect(formMatch([p('lead', 0, 0)], 60_000)).toBeNull();
  });
});

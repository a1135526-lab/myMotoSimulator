import { describe, expect, it, vi } from 'vitest';
import type { GhostSample } from '@/domain';
import { decodeGhost, encodeGhost, sendScore } from './leaderboard';
import { errorText, onlineEnabled } from './supabase';

/** A 61.25 s lap sampled every 0.1 s, as the recorder keeps it, ending on the line. */
const lapS = 61.25;
const samples: GhostSample[] = [
  ...Array.from({ length: Math.floor(lapS * 10) + 1 }, (_, i) => ({
    t: i / 10,
    x: i * 2.5,
    z: Math.sin(i / 30) * 40,
    heading: i / 100,
    lean: 0.3,
  })),
  { t: lapS, x: 1531, z: 0, heading: 6, lean: 0 },
];

describe('uploaded ghosts', () => {
  const flat = encodeGhost(samples);
  const back = decodeGhost(flat);

  it('keep one sample per 0.2 s and still end on the lap time', () => {
    expect(flat.length % 5).toBe(0);
    const count = flat.length / 5;
    // What the server accepts (schema.sql: within 15 % of lap / 0.2 s).
    expect(count).toBeGreaterThan((lapS / 0.2) * 0.85);
    expect(count).toBeLessThan((lapS / 0.2) * 1.15 + 5);
    expect(back?.[back.length - 1]?.t).toBe(lapS);
  });

  it('read back as the same line', () => {
    expect(back?.[10]).toEqual({
      t: 2,
      x: 50,
      z: expect.closeTo(Math.sin(20 / 30) * 40, 2),
      heading: 0.2,
      lean: 0.3,
    });
  });

  it('reject anything malformed', () => {
    expect(decodeGhost('x')).toBeNull();
    expect(decodeGhost([1, 2, 3])).toBeNull();
    expect(decodeGhost([1, 2, 3, 4, 'a', 1, 2, 3, 4, 5])).toBeNull();
  });
});

describe('talking to the server', () => {
  it('is off in tests: no server configured', () => {
    expect(onlineEnabled).toBe(false);
  });

  it('turns server error codes into words', () => {
    expect(errorText({ message: 'nickname_taken' })).toContain('已經有人用');
    expect(errorText({ message: 'P0001: implausible_time' })).toContain('檢查');
    expect(errorText(new TypeError('Failed to fetch'))).toContain('網路');
    expect(errorText(null)).toContain('錯誤');
  });

  it('a score is not sent when nobody is signed in', () => {
    const send = vi.fn();
    const update = vi.fn();
    sendScore(send, update);
    expect(send).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ state: 'off' });
  });
});

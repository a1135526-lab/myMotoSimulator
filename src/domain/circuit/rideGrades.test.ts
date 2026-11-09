import { describe, expect, it } from 'vitest';
import { gradeOf, rideGrades, type RideFacts } from './rideGrades';
import { EMPTY_TALLY, type RideTally } from './rideTally';

const tally = (patch: Partial<RideTally>): RideTally => ({
  ...EMPTY_TALLY,
  racingS: 180,
  corners: 30,
  cornerPace: 30 * 0.97,
  upshifts: 20,
  goodUpshifts: 19,
  ...patch,
});

const facts = (patch: Partial<RideFacts> = {}): RideFacts => ({
  tally: tally({}),
  lapTimesS: [62, 58.1, 58.3],
  reactionS: 0.18,
  jumpStart: false,
  manualShift: true,
  ...patch,
});

const item = (f: RideFacts, key: string) => rideGrades(f).items.find((i) => i.key === key);

describe('ride grades', () => {
  it('letters run S to E', () => {
    expect([95, 85, 70, 55, 40, 10].map(gradeOf)).toEqual(['S', 'A', 'B', 'C', 'D', 'E']);
  });

  it('a fast, clean, tidy race grades high', () => {
    const g = rideGrades(facts({ tally: tally({ drifts: 6 }) }));
    expect(['S', 'A']).toContain(g.grade);
    expect(g.items.map((i) => i.key)).toEqual([
      'cornering',
      'limits',
      'clean',
      'consistency',
      'shifting',
      'launch',
      'drift',
    ]);
  });

  it('running off the track costs the track-limits grade', () => {
    const off = tally({ offTrackS: 15, excursions: 9 });
    expect(item(facts({ tally: off }), 'limits')?.grade).toBe('E');
    expect(item(facts(), 'limits')?.score).toBe(100);
  });

  it('hits and resets are counted against you', () => {
    expect(item(facts({ tally: tally({ hits: 3 }) }), 'clean')?.score).toBe(55);
    expect(item(facts({ tally: tally({ resets: 2 }) }), 'limits')?.score).toBe(70);
  });

  it('a jump start scores no launch points', () => {
    expect(item(facts({ jumpStart: true }), 'launch')?.score).toBe(0);
  });

  it('shifting is only graded for riders who shift by hand', () => {
    expect(item(facts({ manualShift: false }), 'shifting')).toBeUndefined();
    const early = tally({ goodUpshifts: 5 });
    expect(item(facts({ tally: early }), 'shifting')?.grade).toBe('E');
  });

  it('consistency needs two flying laps', () => {
    expect(item(facts({ lapTimesS: [60, 58] }), 'consistency')).toBeUndefined();
    expect(item(facts({ lapTimesS: [62, 58, 64] }), 'consistency')?.grade).toBe('E');
  });

  it('slow corners grade low', () => {
    const slow = tally({ cornerPace: 30 * 0.8 });
    expect(item(facts({ tally: slow }), 'cornering')?.score).toBe(20);
  });
});

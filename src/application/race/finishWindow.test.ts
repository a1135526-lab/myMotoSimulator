import { describe, expect, it } from 'vitest';
import type { CircuitRaceState } from '@/domain';
import type { CircuitView } from '../viewModels/circuit';
import { finishWindowClosed, withFinishWindow } from './finishWindow';

const race = (clockS: number, flags: (number | null)[]) =>
  ({
    phase: 'racing',
    clockS,
    lightsOutAtS: 5,
    riders: flags.map((finishedAtS) => ({ finishedAtS })),
  }) as unknown as CircuitRaceState;

const view = (phase: string, raceTimeS: number, times: (number | null)[]) =>
  ({
    phase,
    raceTimeS,
    riders: times.map((finishTimeS) => ({ finishTimeS })),
  }) as unknown as CircuitView;

describe('ranked finish window', () => {
  it('closes 15 s after the first flag, whoever took it', () => {
    expect(finishWindowClosed(race(200, [null, null]))).toBe(false);
    // An AI flagged at race time 95 (clock 100): open until race time 110.
    expect(finishWindowClosed(race(114, [null, 100]))).toBe(false);
    expect(finishWindowClosed(race(115, [null, 100]))).toBe(true);
  });

  it('counts down on screen, then marks whoever is still out unfinished', () => {
    expect(withFinishWindow(view('racing', 50, [null, null])).finishCountdownS).toBeUndefined();
    expect(withFinishWindow(view('racing', 101, [95, null])).finishCountdownS).toBe(9);
    const over = withFinishWindow(view('finished', 110, [95, null]));
    expect(over.finishCountdownS).toBeNull();
    expect(over.riders.map((r) => r.dnf === true)).toEqual([false, true]);
  });
});

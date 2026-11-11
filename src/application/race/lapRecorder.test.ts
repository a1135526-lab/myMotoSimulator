import { describe, expect, it } from 'vitest';
import { buildCircuit, type CircuitRaceState, type CircuitRider } from '@/domain';
import { LapRecorder } from './lapRecorder';

const geo = buildCircuit(
  Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return { x: 200 * Math.cos(a), z: 200 * Math.sin(a) };
  }),
  6,
);

type Patch = Partial<Pick<CircuitRider, 'hitAtS' | 'wallHitAtS' | 'surface'>>;

/** Rides one 60 s lap, applying `during` half way round; returns whether it counted. */
function lap(during: Patch): boolean {
  const rec = new LapRecorder();
  const rider = (clockS: number, patch: Patch, laps: number[]) =>
    ({
      lat: { s: clockS * 10, d: 0, psi: 0, lean: 0 },
      surface: 'track',
      hitAtS: null,
      wallHitAtS: null,
      lapStartedAtS: laps.length ? 60 : 0,
      lapTimesS: laps,
      ...patch,
    }) as unknown as CircuitRider;
  const at = (clockS: number, patch: Patch, laps: number[] = []) =>
    rec.observe(geo, {
      clockS,
      riders: [rider(clockS, patch, laps)],
    } as unknown as CircuitRaceState);
  at(0, {});
  at(30, during);
  return at(60, {}, [60])?.clean ?? false;
}

describe('LapRecorder: which laps count', () => {
  it('a clean lap counts', () => expect(lap({})).toBe(true));

  it('running wide onto the grass still counts', () =>
    expect(lap({ surface: 'runoff' })).toBe(true));

  it('bumping another rider still counts', () => expect(lap({ hitAtS: 30 })).toBe(true));

  it('hitting the wall does not', () => expect(lap({ hitAtS: 30, wallHitAtS: 30 })).toBe(false));
});

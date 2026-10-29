import { describe, expect, it } from 'vitest';
import { driftCurvature, DRIFT_EXTRA_G, stepDrift, wantsDrift } from './drift';
import { STANDARD_GRAVITY } from '../units';

const settle = (wanted: boolean, steer: number, v: number, from = 0, seconds = 1) => {
  let d = from;
  for (let i = 0; i < seconds * 240; i++) d = stepDrift(d, wanted, steer, v, 1 / 240);
  return d;
};

describe('brake drift', () => {
  it('needs both brake and steer', () => {
    expect(wantsDrift(1, 1)).toBe(true);
    expect(wantsDrift(1, 0)).toBe(false);
    expect(wantsDrift(0.2, -1)).toBe(false);
  });

  it('slides toward the steered side and recovers when released', () => {
    expect(settle(true, -1, 25)).toBe(-1);
    expect(settle(true, 1, 25)).toBe(1);
    expect(settle(false, 1, 25, 1)).toBe(0);
  });

  it('does not start at walking pace', () => {
    expect(settle(true, 1, 4)).toBe(0);
  });

  it('adds DRIFT_EXTRA_G of cornering at full slide', () => {
    const v = 30;
    expect(driftCurvature(1, v) * v * v).toBeCloseTo(DRIFT_EXTRA_G * STANDARD_GRAVITY);
    expect(driftCurvature(-0.5, v)).toBeLessThan(0);
  });
});

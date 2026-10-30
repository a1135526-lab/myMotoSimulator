import { describe, expect, it } from 'vitest';
import {
  DRIFT_BRAKE_SHARE,
  driftBrakeShare,
  driftCurvature,
  DRIFT_EXTRA_G,
  stepDrift,
  wantsDrift,
} from './drift';
import { STANDARD_GRAVITY } from '../units';

const settle = (wanted: boolean, steer: number, v: number, from = 0, seconds = 1) => {
  let d = from;
  for (let i = 0; i < seconds * 240; i++) d = stepDrift(d, wanted, steer, v, 1 / 240);
  return d;
};

describe('brake drift', () => {
  it('is driven by a hard brake; steer picks the side', () => {
    expect(wantsDrift(1)).toBe(true);
    expect(wantsDrift(0.2)).toBe(false);
    expect(settle(true, 0, 25)).toBe(0); // braking straight: no slide
  });

  it('holds the slide as long as the brake stays on, even with the steer centred', () => {
    const sliding = settle(true, 1, 25);
    expect(settle(true, 0, 25, sliding, 5)).toBe(1);
    expect(settle(false, 0, 25, sliding)).toBe(0);
  });

  it('only the rear brakes while sideways, so speed lasts', () => {
    expect(driftBrakeShare(0, 1)).toBe(1);
    expect(driftBrakeShare(1, 1)).toBeCloseTo(DRIFT_BRAKE_SHARE);
  });

  it('counter-steer straightens the line instead of tightening it', () => {
    expect(driftCurvature(1, 20, -1)).toBe(0);
    expect(driftCurvature(1, 20, 0)).toBeGreaterThan(0);
    expect(driftCurvature(1, 20, 1)).toBeGreaterThan(driftCurvature(1, 20, 0));
  });

  it('slides toward the steered side and recovers when released', () => {
    expect(settle(true, -1, 25)).toBe(-1);
    expect(settle(true, 1, 25)).toBe(1);
    expect(settle(false, 1, 25, 1)).toBe(0);
  });

  it('does not start at walking pace', () => {
    expect(settle(true, 1, 3)).toBe(0);
  });

  it('adds DRIFT_EXTRA_G of cornering at full slide', () => {
    const v = 30;
    expect(driftCurvature(1, v) * v * v).toBeCloseTo(DRIFT_EXTRA_G * STANDARD_GRAVITY);
    expect(driftCurvature(-0.5, v)).toBeLessThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { ghostPoseAt, type GhostSample } from './ghost';

const sample = (t: number, x: number, heading = 0): GhostSample => ({
  t,
  x,
  z: 0,
  heading,
  lean: x / 10,
});

describe('ghostPoseAt', () => {
  const samples = [sample(0, 0), sample(0.1, 1), sample(0.2, 3)];

  it('eases between samples', () => {
    expect(ghostPoseAt(samples, 0.05)?.x).toBeCloseTo(0.5);
    expect(ghostPoseAt(samples, 0.15)?.x).toBeCloseTo(2);
    expect(ghostPoseAt(samples, 0.2)?.lean).toBeCloseTo(0.3);
  });

  it('is gone before the lap starts and after it ends', () => {
    expect(ghostPoseAt(samples, -0.01)).toBeNull();
    expect(ghostPoseAt(samples, 0.21)).toBeNull();
    expect(ghostPoseAt([], 0)).toBeNull();
  });

  it('turns the short way round across ±π', () => {
    const h = ghostPoseAt([sample(0, 0, 3.1), sample(1, 0, -3.1)], 0.5)?.heading ?? 0;
    expect(Math.abs(Math.atan2(Math.sin(h), Math.cos(h)))).toBeGreaterThan(3.1);
  });
});

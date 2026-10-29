import { describe, expect, it } from 'vitest';
import { buildCircuit, maxCurvature, sampleAt, toWorld, wrapS } from './geometry';

/** A circle of radius R traced counter-clockwise as seen from above (+z is down the screen). */
const circle = (r: number) =>
  Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    return { x: r * Math.cos(a), z: -r * Math.sin(a) };
  });

describe('circuit geometry', () => {
  const geo = buildCircuit(circle(100), 6);

  it('resamples a closed loop of the right length', () => {
    expect(geo.length).toBeCloseTo(2 * Math.PI * 100, -1);
    expect(geo.step).toBeCloseTo(2, 0);
  });

  it('has constant left-hand curvature 1/R on a CCW circle', () => {
    for (const p of geo.samples) expect(Math.abs(p.curvature - 1 / 100)).toBeLessThan(0.0005);
    expect(1 / maxCurvature(geo)).toBeCloseTo(100, -1);
  });

  it('turns exactly one full revolution per lap', () => {
    const turn = geo.samples.reduce((a, p) => a + p.curvature * geo.step, 0);
    expect(turn).toBeCloseTo(2 * Math.PI, 1);
  });

  it('wraps s around the lap and interpolates between samples', () => {
    expect(wrapS(geo, geo.length + 5)).toBeCloseTo(5);
    expect(wrapS(geo, -5)).toBeCloseTo(geo.length - 5);
    const a = sampleAt(geo, 10);
    const b = sampleAt(geo, 10 + geo.length);
    expect(a.x).toBeCloseTo(b.x);
  });

  it('offsets to the left of travel (towards the centre on a CCW circle)', () => {
    const centre = toWorld(geo, 0, 0);
    const left = toWorld(geo, 0, 10);
    expect(Math.hypot(left.x, left.z)).toBeLessThan(Math.hypot(centre.x, centre.z));
  });

  it('a clockwise loop is all right-handers', () => {
    const cw = buildCircuit(
      circle(100).map((p) => ({ x: p.x, z: -p.z })),
      6,
    );
    expect(cw.samples.every((p) => p.curvature < 0)).toBe(true);
  });

  it('rejects too few control points', () => {
    expect(() => buildCircuit(circle(100).slice(0, 3), 6)).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { elevationAt, steepestGrade } from './elevation';
import { buildCircuit, sampleAt } from './geometry';

const keys = [
  [0, 10],
  [0.25, 30],
  [0.5, 30],
  [0.75, 0],
] as const;

describe('circuit elevation', () => {
  it('passes through every key and eases between them', () => {
    expect(elevationAt(keys, 0)).toBeCloseTo(10);
    expect(elevationAt(keys, 0.25)).toBeCloseTo(30);
    expect(elevationAt(keys, 0.125)).toBeCloseTo(20);
    expect(elevationAt(keys, 0.4)).toBeCloseTo(30);
    // Wraps: the last key eases back into the first across the line.
    expect(elevationAt(keys, 0.875)).toBeCloseTo(5);
    expect(elevationAt(keys, 1.125)).toBeCloseTo(20);
    expect(elevationAt([], 0.3)).toBe(0);
  });

  it('gives samples a height and a grade that match the climb', () => {
    const circle = Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return { x: 300 * Math.cos(a), z: -300 * Math.sin(a) };
    });
    const geo = buildCircuit(circle, 6, 2, keys);
    const mid = sampleAt(geo, geo.length * 0.125);
    expect(mid.y).toBeCloseTo(20, 0);
    // Steepest halfway up: (π/2)·Δh/Δs.
    const steep = steepestGrade(keys, geo.length);
    expect(mid.grade).toBeCloseTo((Math.PI / 2) * (20 / (geo.length * 0.25)), 2);
    expect(steep).toBeCloseTo((Math.PI / 2) * (30 / (geo.length * 0.25)), 5);
    expect(sampleAt(geo, geo.length * 0.375).grade).toBeCloseTo(0, 3);
    expect(sampleAt(geo, geo.length * 0.625).grade).toBeLessThan(0);
  });
});

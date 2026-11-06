import { describe, expect, it } from 'vitest';
import { buildCircuit, findCorners, maxCurvature, sampleAt, wrapS } from '@/domain';
import { CIRCUITS } from './index';

describe('circuits', () => {
  it('have unique ids', () => {
    expect(new Set(CIRCUITS.map((c) => c.id)).size).toBe(CIRCUITS.length);
  });

  for (const c of CIRCUITS) {
    it(`${c.name}: rideable corners, and no part of the loop runs into another`, () => {
      const geo = buildCircuit(c.controlPoints, c.widthM / 2);
      expect(geo.length).toBeGreaterThan(900);
      expect(geo.length).toBeLessThan(4500);
      // No corner too tight to get round: 40 m radius at least, 50 m for the big ones.
      expect(1 / maxCurvature(geo)).toBeGreaterThan(39);
      const corners = findCorners(geo);
      expect(corners.length).toBeGreaterThanOrEqual(4);
      for (const k of corners.filter((x) => x.turnDeg > 120)) {
        expect(k.minRadiusM).toBeGreaterThan(49);
      }
      // Barrier to barrier: stretches far apart along the lap stay apart on the ground.
      const clear = c.widthM + 2 * c.runoffM;
      for (let s = 0; s < geo.length; s += 10) {
        const a = sampleAt(geo, s);
        for (let t = s + 150; t < s + geo.length - 150; t += 10) {
          const b = sampleAt(geo, wrapS(geo, t));
          expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(clear);
        }
      }
    });
  }
});

import { describe, expect, it } from 'vitest';
import { cornerKind, findCorners, nextCorner } from './corners';
import { buildCircuit, type Vec2 } from './geometry';

/**
 * A rounded rectangle, counter-clockwise from above: four left-handers of
 * radius r joined by straights, with points spaced about evenly (as the
 * spline likes).
 */
function stadium(w: number, h: number, r: number): Vec2[] {
  const pts: Vec2[] = [];
  const centres = [
    { x: w / 2 - r, z: -(h / 2 - r), from: 0 },
    { x: -(w / 2 - r), z: -(h / 2 - r), from: 90 },
    { x: -(w / 2 - r), z: h / 2 - r, from: 180 },
    { x: w / 2 - r, z: h / 2 - r, from: 270 },
  ];
  const at = (c: (typeof centres)[number], deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: c.x + r * Math.cos(a), z: c.z - r * Math.sin(a) };
  };
  centres.forEach((c, i) => {
    for (let k = 0; k < 6; k++) pts.push(at(c, c.from + k * 15));
    // The straight to the next corner, a point every ~10 m.
    const next = centres[(i + 1) % centres.length] as (typeof centres)[number];
    const a = at(c, c.from + 90);
    const b = at(next, next.from);
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 10));
    for (let k = 0; k < n; k++) {
      pts.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
    }
  });
  return pts;
}

describe('circuit corners', () => {
  const geo = buildCircuit(stadium(400, 300, 40), 6);
  const corners = findCorners(geo);

  it('finds the four corners, each a left of about 90°', () => {
    expect(corners).toHaveLength(4);
    for (const c of corners) {
      expect(c.dir).toBe('left');
      expect(c.turnDeg).toBeGreaterThan(70);
      expect(c.turnDeg).toBeLessThan(110);
      expect(c.kind).toBe('tight');
    }
  });

  it('a clockwise loop turns right', () => {
    const cw = buildCircuit(
      stadium(400, 300, 40).map((p) => ({ x: p.x, z: -p.z })),
      6,
    );
    expect(findCorners(cw).every((c) => c.dir === 'right')).toBe(true);
  });

  it('tells the distance to the next corner, and 0 while in one', () => {
    const c = corners[1];
    if (!c) throw new Error('no corner');
    expect(nextCorner(geo, corners, c.startS - 50)?.distanceM).toBeCloseTo(50, 0);
    expect(nextCorner(geo, corners, c.startS + 2)).toEqual({ corner: c, distanceM: 0 });
    // Wraps past the end of the lap.
    const last = corners[corners.length - 1];
    if (!last) throw new Error('no corner');
    const after = nextCorner(geo, corners, last.endS + 5 - geo.length);
    expect(after?.corner).not.toBe(last);
  });

  it('names corners by how tight they are', () => {
    expect(cornerKind(20, 90)).toBe('hairpin');
    expect(cornerKind(80, 170)).toBe('hairpin');
    expect(cornerKind(45, 90)).toBe('tight');
    expect(cornerKind(90, 60)).toBe('medium');
    expect(cornerKind(150, 40)).toBe('fast');
  });
});

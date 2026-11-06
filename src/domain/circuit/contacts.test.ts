import { describe, expect, it } from 'vitest';
import {
  avoidLine,
  BIKE_LENGTH_M,
  BIKE_WIDTH_M,
  bounceOffBarrier,
  gapAlong,
  HARD_HIT_MPS,
  resolveContacts,
  toTrack,
} from './contacts';
import { buildCircuit, toWorld } from './geometry';

const geo = buildCircuit(
  [
    [0, 0],
    [200, 0],
    [240, 40],
    [240, 160],
    [200, 200],
    [0, 200],
    [-40, 160],
    [-40, 40],
  ].map(([x, z]) => ({ x: x as number, z: z as number })),
  6,
);
const limits = { halfWidth: 6, runoffM: 15, gripG: 1.2 };
const bike = (s: number, d: number, speedMps: number, psi = 0) => ({ s, d, psi, speedMps });

describe('barrier', () => {
  it('throws the rider back off it, slower, instead of stopping them dead', () => {
    const edge = limits.halfWidth + limits.runoffM;
    const b = bounceOffBarrier(limits, { s: 50, d: edge + 0.2, psi: 0.3, lean: 0.4 }, 30);
    expect(b.lat.d).toBeLessThan(edge);
    expect(b.lat.psi).toBeLessThan(0); // now heading back towards the track (to the right)
    expect(b.lat.lean).toBe(0);
    expect(b.speedMps).toBeGreaterThan(20);
    expect(b.speedMps).toBeLessThan(30);
    expect(b.impactMps).toBeCloseTo(30 * Math.sin(0.3));
  });

  it('a glancing touch keeps most of the speed', () => {
    const edge = limits.halfWidth + limits.runoffM;
    const b = bounceOffBarrier(limits, { s: 50, d: -edge - 0.1, psi: -0.05, lean: 0 }, 30);
    expect(b.impactMps).toBeLessThan(HARD_HIT_MPS);
    expect(b.lat.d).toBeGreaterThan(-edge);
  });
});

describe('bike to bike', () => {
  it('measures the gap the short way round the lap', () => {
    expect(gapAlong(geo, geo.length - 1, 1)).toBeCloseTo(2);
    expect(gapAlong(geo, 1, geo.length - 1)).toBeCloseTo(-2);
  });

  it('pushes bikes side by side apart across the track', () => {
    const { bodies } = resolveContacts(geo, [bike(50, 0, 30), bike(50.3, 0.4, 30)]);
    const [a, b] = bodies;
    expect(Math.abs((b?.d ?? 0) - (a?.d ?? 0))).toBeCloseTo(BIKE_WIDTH_M);
    expect(a?.s).toBe(50);
  });

  it('nose to tail: the one behind slows, the one in front is shoved on', () => {
    const { bodies, hard } = resolveContacts(geo, [bike(50, 0, 40), bike(51, 0.1, 30)]);
    const [rear, front] = bodies;
    expect(rear?.speedMps).toBeCloseTo(35);
    expect(front?.speedMps).toBeCloseTo(35);
    expect((front?.s ?? 0) - (rear?.s ?? 0)).toBeCloseTo(BIKE_LENGTH_M);
    expect(hard.has(0) && hard.has(1)).toBe(true);
  });

  it('a fixed bike (a remote player) does not move; the other takes all of it', () => {
    const { bodies } = resolveContacts(geo, [bike(50, 0, 40), bike(51, 0, 30)], (i) => i === 1);
    expect(bodies[1]).toEqual(bike(51, 0, 30));
    expect(bodies[0]?.speedMps).toBeCloseTo(30);
    expect(bodies[0]?.s).toBeCloseTo(51 - BIKE_LENGTH_M);
  });

  it('leaves bikes that are apart alone', () => {
    const input = [bike(50, 0, 30), bike(50, 2, 30), bike(60, 0, 30)];
    const { bodies, hard } = resolveContacts(geo, input);
    expect(bodies).toEqual(input);
    expect(hard.size).toBe(0);
  });
});

describe('placing and passing', () => {
  it('finds track coordinates for a world point', () => {
    const w = toWorld(geo, 120, 2.5);
    const t = toTrack(geo, w.x, w.z, 110);
    expect(t.s).toBeCloseTo(120, 0);
    expect(t.d).toBeCloseTo(2.5, 1);
  });

  it('an AI rider moves off its line to go round a slower bike ahead', () => {
    const me = bike(50, 0, 40);
    expect(avoidLine(geo, me, 0, limits.halfWidth, [bike(58, 0.3, 30)])).not.toBe(0);
    expect(avoidLine(geo, me, 0, limits.halfWidth, [bike(58, 0.3, 45)])).toBe(0);
    expect(avoidLine(geo, me, 0, limits.halfWidth, [bike(40, 0, 30)])).toBe(0);
  });
});

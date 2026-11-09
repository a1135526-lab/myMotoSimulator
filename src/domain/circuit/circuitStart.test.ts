import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { buildModel } from '../simulation/model';
import { CIRCUIT_SKILLS } from './circuitAi';
import { advanceCircuitRace, type CircuitCommand } from './circuitAdvance';
import { createCircuitRace, startLights } from './circuitRace';
import { gridSlots, gridSpot, START_GRACE_S } from './circuitStart';
import { buildCircuit } from './geometry';

const geo = buildCircuit(
  [
    [0, 0],
    [300, 0],
    [340, 40],
    [340, 160],
    [300, 200],
    [0, 200],
    [-40, 160],
    [-40, 40],
  ].map(([x, z]) => ({ x: x as number, z: z as number })),
  6,
);
const limits = { halfWidth: 6, runoffM: 15, gripG: 1.2 };
const manual = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));
const settings = { laps: 1, limits, assist: true, brakeAssist: false, autoShift: true };
const go: CircuitCommand = {
  throttlePressed: true,
  brakePressed: false,
  clutchPressed: false,
  steerLeftPressed: false,
  steerRightPressed: false,
};

const idle: CircuitCommand = { ...go, throttlePressed: false };

describe('the start', () => {
  it('staggered: two a row; parallel: all four abreast, spread across the track', () => {
    expect([0, 1, 2, 3].map((k) => gridSpot(k, 4, 'staggered', 6))).toEqual([
      { s: -9, d: 2.6 },
      { s: -9, d: -2.6 },
      { s: -18, d: 2.6 },
      { s: -18, d: -2.6 },
    ]);
    const abreast = [0, 1, 2, 3].map((k) => gridSpot(k, 4, 'parallel', 6));
    expect(new Set(abreast.map((p) => p.s))).toEqual(new Set([-9]));
    [4.5, 1.5, -1.5, -4.5].forEach((d, k) => expect(abreast[k]?.d).toBeCloseTo(d));
    expect(gridSpot(0, 1, 'parallel', 6).d).toBe(0);
  });

  it('in a friend room each player takes their own slot; the AI fill the rest', () => {
    expect(gridSlots(1, 2)).toEqual([2]);
    expect(gridSlots(4, 0)).toEqual([0, 1, 2, 3]);
    expect(gridSlots(3, 1)).toEqual([1, 0, 2]);
  });

  it('nobody counts as hit while the pack gets away, on either grid', () => {
    for (const grid of ['staggered', 'parallel'] as const) {
      let race = startLights(
        createCircuitRace(geo, [manual, manual, manual, manual], {
          settings,
          aiSkills: [CIRCUIT_SKILLS.pro, CIRCUIT_SKILLS.pro, CIRCUIT_SKILLS.pro],
          holdS: 0.5,
          grid,
        }),
      );
      while (race.clockS < race.lightsOutAtS + START_GRACE_S - 0.1) {
        // Wait for the lights, then go (going early is a jump start).
        const command = race.clockS > race.lightsOutAtS + 0.3 ? go : idle;
        race = advanceCircuitRace(geo, [manual, manual, manual, manual], race, command, 1 / 30);
      }
      expect(race.riders.every((r) => r.hitAtS === null)).toBe(true);
      expect(race.riders.every((r) => r.progressM > 10)).toBe(true);
    }
  });
});

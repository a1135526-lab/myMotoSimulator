import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { buildModel } from '../simulation/model';
import { advanceCircuitRace, type CircuitCommand } from './circuitAdvance';
import { CIRCUIT_SKILLS } from './circuitAi';
import { createCircuitRace, startLights } from './circuitRace';
import { BIKE_LENGTH_M, BIKE_WIDTH_M, gapAlong } from './contacts';
import { buildCircuit } from './geometry';

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
const manual = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));
const settings = { laps: 1, limits, assist: true, brakeAssist: false, autoShift: true };
const models = [manual, manual];
const idle: CircuitCommand = {
  throttlePressed: false,
  brakePressed: false,
  clutchPressed: false,
  steerLeftPressed: false,
  steerRightPressed: false,
};
const fresh = () =>
  createCircuitRace(geo, models, { settings, aiSkills: [CIRCUIT_SKILLS.average], holdS: 0.5 });
const runFor = (race: ReturnType<typeof fresh>, seconds: number) => {
  let r = race;
  for (let t = 0; t < seconds; t += 1 / 30) r = advanceCircuitRace(geo, models, r, idle, 1 / 30);
  return r;
};

describe('bikes in a race', () => {
  it('bikes never ride through each other: the AI goes round a bike stopped on its line', () => {
    let race = runFor(startLights(fresh()), 7);
    const [player, ai] = race.riders;
    if (!player || !ai) throw new Error('no riders');
    // Parked on the AI's line a little way up the road.
    const parked = { ...player, lat: { ...player.lat, s: 120, d: race.ai[0]?.lineD ?? 0 } };
    race = { ...race, riders: [parked, ai] };
    let closest = Infinity;
    const past = (r: typeof race) => (r.riders[1]?.progressM ?? 0) > ai.startGapM + 160;
    while (race.clockS < 60 && !past(race)) {
      race = advanceCircuitRace(geo, models, race, idle, 1 / 30);
      const [p, a] = race.riders;
      if (!p || !a) break;
      if (Math.abs(gapAlong(geo, p.lat.s, a.lat.s)) < BIKE_LENGTH_M) {
        closest = Math.min(closest, Math.abs(p.lat.d - a.lat.d));
      }
    }
    expect(past(race)).toBe(true);
    expect(closest).toBeLessThan(Infinity); // they did come alongside
    expect(closest).toBeGreaterThan(BIKE_WIDTH_M - 0.05);
  });
});

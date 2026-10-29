import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { buildModel } from '../simulation/model';
import { createInitialState } from '../simulation/simulator';
import { STANDARD_GRAVITY } from '../units';
import { autoGearbox } from './autoGearbox';
import {
  ASSIST_SKILL,
  brakeAssist,
  CIRCUIT_SKILLS,
  profileAt,
  riderSkill,
  speedProfile,
} from './circuitAi';
import {
  advanceCircuitRace,
  createCircuitRace,
  litLights,
  LIGHT_COUNT,
  resetPlayer,
  startLights,
  stepCircuitRace,
  type CircuitCommand,
} from './circuitRace';
import { buildCircuit } from './geometry';
import { estimateLapTime } from './lapEstimate';
import { longitudinalGripShare, maxLean, pathCurvature, surfaceAt, targetLean } from './lateral';

/** Rounded rectangle-ish loop (~1 km) with 4 corners of R ≈ 40 m. */
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

describe('cornering physics', () => {
  it('lean limit is atan(grip) (with a small margin)', () => {
    expect(maxLean(1)).toBeCloseTo((Math.PI / 4) * 0.97);
    expect(maxLean(1.3)).toBeGreaterThan(maxLean(1));
  });

  it('a turn at lean φ has curvature g·tanφ/v²', () => {
    expect(pathCurvature(Math.PI / 4, 20, 0)).toBeCloseTo(STANDARD_GRAVITY / 400);
    expect(pathCurvature(0.5, 1, 1)).toBeGreaterThan(0); // slow-speed steering
  });

  it('friction circle: less grip left for drive/brake when leaned', () => {
    expect(longitudinalGripShare(0, 1.2)).toBe(1);
    expect(longitudinalGripShare(0.6, 1.2)).toBeLessThan(1);
    expect(longitudinalGripShare(Math.atan(1.2), 1.2)).toBeCloseTo(0);
  });

  it('classifies tarmac, run-off and barrier', () => {
    expect(surfaceAt(limits, 5)).toBe('track');
    expect(surfaceAt(limits, -10)).toBe('runoff');
    expect(surfaceAt(limits, 25)).toBe('barrier');
  });

  it('assist leans into the corner; manual maps steer onto lean', () => {
    const inCorner = tightest(geo);
    const state = { s: inCorner.s, d: 0, psi: 0, lean: 0 };
    const lean = targetLean(geo, state, 15, 0, 1.2, true);
    expect(Math.sign(lean)).toBe(Math.sign(inCorner.curvature));
    expect(Math.abs(lean)).toBeGreaterThan(0.2);
    expect(targetLean(geo, state, 15, 0, 1.2, false)).toBe(0);
    expect(targetLean(geo, state, 15, -1, 1.2, false)).toBeCloseTo(-maxLean(1.2));
  });
});

function tightest(g: typeof geo) {
  return g.samples.reduce((a, p) => (Math.abs(p.curvature) > Math.abs(a.curvature) ? p : a));
}

describe('auto gearbox', () => {
  it('selects 1st from neutral and slips the clutch to pull away', () => {
    const idle = createInitialState(manual);
    expect(autoGearbox(manual, idle, 1)).toEqual({ clutchLever: 1, shift: 1 });
    const inFirst = { ...idle, gear: 1 };
    expect(autoGearbox(manual, inFirst, 1).clutchLever).toBe(1);
    const revving = { ...inFirst, engineRpm: 5000 };
    expect(autoGearbox(manual, revving, 1).clutchLever).toBeLessThan(1);
  });

  it('downshifts when slow in a high gear', () => {
    const cruising = { ...createInitialState(manual), gear: 5, engineRpm: 3000, speedMps: 15 };
    expect(autoGearbox(manual, cruising, 0).shift).toBe(-1);
  });
});

describe('AI speed profile', () => {
  const profile = speedProfile(geo, 1.2, CIRCUIT_SKILLS.pro);
  it('slows for corners and brakes before them', () => {
    const corner = tightest(geo);
    const straight = geo.samples.reduce((a, p) =>
      Math.abs(p.curvature) < Math.abs(a.curvature) ? p : a,
    );
    expect(profileAt(geo, profile, corner.s)).toBeLessThan(profileAt(geo, profile, straight.s));
  });

  it('brake assist leaves slow riding alone and brakes for overspeed', () => {
    const corner = tightest(geo);
    const assist = speedProfile(geo, 1.2, ASSIST_SKILL);
    const full = { throttle: 1, brake: 0, clutchLever: 0 };
    expect(brakeAssist(geo, assist, corner.s, 5, full)).toEqual(full);
    const fast = brakeAssist(geo, assist, corner.s, 40, full);
    expect(fast.throttle).toBe(0);
    expect(fast.brake).toBeGreaterThan(0.5);
  });

  it('grid-mates of one level differ a little, within grip', () => {
    const riders = [0, 1, 2].map((i) => riderSkill(CIRCUIT_SKILLS.pro, i).cornerGripUse);
    expect(new Set(riders).size).toBe(3);
    expect(Math.max(...riders)).toBeLessThan(0.95);
  });

  it('a cautious rider plans slower corners', () => {
    const novice = speedProfile(geo, 1.2, CIRCUIT_SKILLS.novice);
    expect(Math.min(...novice)).toBeLessThan(Math.min(...profile));
  });
});

/** advance() caps each call at 1 s of physics, so long waits go in small steps. */
const runFor = (
  race: ReturnType<typeof createCircuitRace>,
  seconds: number,
  command: CircuitCommand,
  models: Parameters<typeof advanceCircuitRace>[1],
) => {
  let r = race;
  for (let t = 0; t < seconds; t += 1 / 30) r = advanceCircuitRace(geo, models, r, command, 1 / 30);
  return r;
};

describe('circuit race', () => {
  const models = [manual, manual];
  const fresh = () =>
    createCircuitRace(geo, models, { settings, aiSkills: [CIRCUIT_SKILLS.average], holdS: 0.5 });
  const idle: CircuitCommand = {
    throttlePressed: false,
    brakePressed: false,
    clutchPressed: false,
    steerLeftPressed: false,
    steerRightPressed: false,
  };

  it('lights come on one per second, then go out', () => {
    let race = startLights(fresh());
    expect(litLights(race)).toBe(0);
    race = runFor(race, 2.5, idle, models);
    expect(litLights(race)).toBe(2);
    race = runFor(race, 3.2, idle, models);
    expect(race.phase).toBe('racing');
    expect(litLights(race)).toBe(0);
    expect(LIGHT_COUNT).toBe(5);
  });

  it('holds everyone on the grid until lights out', () => {
    let race = startLights(fresh());
    for (let i = 0; i < 4 * 240; i++) {
      race = stepCircuitRace(geo, models, race, { throttle: 1, brake: 0, clutchLever: 0 }, 0);
    }
    expect(race.riders.every((r) => r.progressM < 0.5)).toBe(true);
  });

  it('the AI completes a lap on the tarmac', () => {
    let race = startLights(fresh());
    while (race.clockS < 200 && (race.riders[1]?.crossings ?? 0) < 2) {
      race = advanceCircuitRace(geo, models, race, idle, 1 / 30);
      expect(race.riders[1]?.surface).not.toBe('barrier');
    }
    expect(race.riders[1]?.lapTimesS.length).toBe(1);
    expect(race.riders[1]?.finishedAtS).not.toBeNull();
  });

  it('flat out with no steering (assist off) runs wide, crashes, then recovers', () => {
    let race = startLights(
      createCircuitRace(geo, models, {
        settings: { ...settings, assist: false },
        aiSkills: [CIRCUIT_SKILLS.average],
        holdS: 0.5,
      }),
    );
    const wot: CircuitCommand = { ...idle, throttlePressed: true };
    let crashed = false;
    for (let t = 0; t < 60 && !crashed; t += 1 / 30) {
      race = advanceCircuitRace(geo, models, race, wot, 1 / 30);
      crashed = race.riders[0]?.crashedUntilS !== null;
    }
    expect(crashed).toBe(true);
    race = runFor(race, 3, idle, models);
    expect(race.riders[0]?.crashedUntilS).toBeNull();
    expect(race.riders[0]?.surface).toBe('track');
  });

  it('R puts the player back on the centreline', () => {
    const race = fresh();
    const moved = {
      ...race,
      riders: race.riders.map((r, i) => (i === 0 ? { ...r, lat: { ...r.lat, d: 9 } } : r)),
    };
    expect(resetPlayer(geo, models, moved).riders[0]?.lat.d).toBe(0);
  });
});

describe('lap estimate', () => {
  it('a stronger bike and a braver rider lap faster', () => {
    const scooter = buildModel(makeConfig());
    const pro = estimateLapTime(geo, manual, 1.2, CIRCUIT_SKILLS.pro);
    const novice = estimateLapTime(geo, manual, 1.2, CIRCUIT_SKILLS.novice);
    expect(pro).toBeLessThan(novice);
    expect(pro).toBeGreaterThan(20);
    expect(estimateLapTime(geo, scooter, 1.2, CIRCUIT_SKILLS.pro)).toBeGreaterThan(0);
  });

  it('agrees with the full time-stepped AI lap within ~15 %', () => {
    let race = startLights(
      createCircuitRace(geo, [manual, manual], {
        settings: { ...settings, laps: 2 },
        aiSkills: [CIRCUIT_SKILLS.pro],
        holdS: 0.5,
      }),
    );
    while (race.clockS < 300 && (race.riders[1]?.crossings ?? 0) < 3) {
      race = stepCircuitRace(
        geo,
        [manual, manual],
        race,
        { throttle: 0, brake: 1, clutchLever: 0 },
        0,
      );
    }
    const flying = race.riders[1]?.lapTimesS[1] ?? 0;
    const estimate = estimateLapTime(geo, manual, 1.2, CIRCUIT_SKILLS.pro);
    expect(Math.abs(estimate - flying) / flying).toBeLessThan(0.15);
  });
});

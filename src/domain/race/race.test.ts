import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { NEUTRAL_INPUT } from '../simulation/inputShaping';
import { buildModel } from '../simulation/model';
import type { ControlCommand } from '../simulation/types';
import { SKILLS, type RiderSkill } from './opponent';
import {
  advanceRace,
  createRace,
  shiftPlayer,
  startCountdown,
  stepRace,
  type RaceModels,
  type RaceState,
} from './race';
import { MIN_HUMAN_REACTION_S } from './reaction';
import { STAGE_BEAM_M } from './racer';
import { raceResult } from './result';
import { treeLights, treeTiming } from './tree';

const scooter = buildModel(makeConfig());
const manual = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));

const setup = (skill: RiderSkill = 'average', distanceM = 201) => ({
  settings: { distanceM, treeMode: 'sportsman' as const },
  opponentSkill: SKILLS[skill],
  opponentReactionS: SKILLS[skill].reactionS,
  stageDelayS: 1,
});

const WOT: ControlCommand = { throttlePressed: true, brakePressed: false, clutchPressed: false };
const IDLE: ControlCommand = { throttlePressed: false, brakePressed: false, clutchPressed: false };
/** A quick but human reaction. */
const REACT_S = 0.2;
const afterGreen = (r: RaceState, s = REACT_S) => r.clockS >= r.tree.greenAtS + s;

/** Run until finished; the player presses `command(race)` each frame. */
function runRace(models: RaceModels, race: RaceState, command: (r: RaceState) => ControlCommand) {
  let r = startCountdown(race);
  for (let i = 0; i < 60 * 120 && r.phase !== 'finished'; i++) {
    r = advanceRace(models, r, command(r), 1 / 60);
  }
  return r;
}

describe('tree', () => {
  it('sportsman: ambers 0.5 s apart, green 0.5 s after the last', () => {
    const t = treeTiming('sportsman', 1);
    expect(t.ambersAtS).toEqual([1, 1.5, 2]);
    expect(t.greenAtS).toBe(2.5);
    expect(treeLights(t, 1.6)).toEqual({ ambers: [true, true, false], green: false });
    expect(treeLights(t, 2.6)).toEqual({ ambers: [false, false, false], green: true });
  });

  it('pro: all ambers together, green 0.4 s later', () => {
    const t = treeTiming('pro', 1);
    expect(t.ambersAtS).toEqual([1, 1, 1]);
    expect(t.greenAtS).toBeCloseTo(1.4);
  });
});

describe('race flow', () => {
  const models = { player: scooter, opponent: scooter };

  it('holds the player on the line while staged, and the clock does not run', () => {
    let r = createRace(models, setup());
    for (let i = 0; i < 120; i++)
      r = stepRace(models, r, { throttle: 1, brake: 0, clutchLever: 0 });
    expect(r.phase).toBe('staged');
    expect(r.clockS).toBe(0);
    expect(r.player.sim.distanceM).toBeLessThan(STAGE_BEAM_M);
  });

  it('goes countdown → racing → finished and records times', () => {
    const r = runRace(models, createRace(models, setup()), (cur) => (afterGreen(cur) ? WOT : IDLE));
    expect(r.phase).toBe('finished');
    const result = raceResult(r);
    expect(result.reason).toBe('finish');
    expect(result.player.reactionS).toBeGreaterThan(0);
    expect(result.player.launchReactionS).toBeCloseTo(REACT_S, 1);
    expect(result.player.elapsedS).toBeGreaterThan(5);
    expect(result.player.trapSpeedKmh).toBeGreaterThan(60);
    expect(result.marginS).not.toBeNull();
  });

  it('flags a false start when the player leaves before green', () => {
    const r = runRace(models, createRace(models, setup()), () => WOT);
    const result = raceResult(r);
    expect(result.player.falseStart).toBe(true);
    expect(result.player.reactionS).toBeLessThan(0);
    expect(result.winner).toBe('opponent');
    expect(result.reason).toBe('falseStart');
  });

  it('a faster reaction wins between identical bikes', () => {
    // Both brake-stand on the line; only the reaction differs.
    const brakeStand = (react: boolean): ControlCommand => ({ ...WOT, brakePressed: !react });
    let r = createRace(models, setup('novice'));
    r = advanceRace(models, r, brakeStand(false), 0.5);
    r = runRace(models, r, (cur) => brakeStand(afterGreen(cur, 0.13)));
    expect(raceResult(r).player.falseStart).toBe(false);
    expect(raceResult(r).winner).toBe('player');
  });

  it('calls a launch quicker than a human can react a false start, even after green', () => {
    const r = runRace(models, createRace(models, setup()), (cur) =>
      afterGreen(cur, 0.03) ? WOT : IDLE,
    );
    const result = raceResult(r);
    expect(result.player.falseStart).toBe(true);
    expect(result.player.launchReactionS).toBeGreaterThanOrEqual(0);
    expect(result.player.launchReactionS).toBeLessThan(MIN_HUMAN_REACTION_S);
    expect(result.reason).toBe('falseStart');
  });

  it('judges the hands, not the beam: a clean launch just over the limit is fine', () => {
    const r = runRace(models, createRace(models, setup()), (cur) =>
      afterGreen(cur, MIN_HUMAN_REACTION_S + 0.03) ? WOT : IDLE,
    );
    expect(raceResult(r).player.falseStart).toBe(false);
  });
});

describe('opponent skill', () => {
  const elapsed = (skill: RiderSkill) => {
    const models = { player: scooter, opponent: manual };
    const r = runRace(models, createRace(models, setup(skill, 402)), () => IDLE);
    return raceResult(r).opponent;
  };

  it('a pro rider runs a quicker ET than a novice on the same manual bike', () => {
    const pro = elapsed('pro');
    const novice = elapsed('novice');
    expect(pro.finished).toBe(true);
    expect(novice.finished).toBe(true);
    expect(pro.elapsedS ?? Infinity).toBeLessThan(novice.elapsedS ?? 0);
    expect(pro.reactionS ?? Infinity).toBeLessThan(novice.reactionS ?? 0);
  });

  it('reacts like a person: within human range and never under the limit', () => {
    for (const skill of ['novice', 'average', 'pro'] as const) {
      const t = elapsed(skill).launchReactionS ?? 0;
      expect(t).toBeGreaterThan(MIN_HUMAN_REACTION_S);
      expect(t).toBeLessThan(0.35);
    }
  });

  it('never false-starts', () => {
    expect(elapsed('pro').falseStart).toBe(false);
  });
});

describe('player on a manual bike', () => {
  const models = { player: manual, opponent: scooter };

  it('can shift while staged and launch with the clutch', () => {
    let r = createRace(models, setup());
    r = advanceRace(models, r, { ...IDLE, clutchPressed: true }, 0.1);
    r = shiftPlayer(models, r, 1);
    expect(r.player.sim.gear).toBe(1);

    const finished = runRace(models, r, (cur) => {
      return { throttlePressed: true, brakePressed: false, clutchPressed: !afterGreen(cur) };
    });
    const result = raceResult(finished).player;
    expect(result.falseStart).toBe(false);
    expect(result.finished).toBe(true);
  });

  it('auto clutch: brake-stand in 1st, let the brake go and it pulls away without stalling', () => {
    const auto = { ...setup(), settings: { ...setup().settings, autoClutch: true } };
    let r = createRace(models, auto);
    r = shiftPlayer(models, r, 1);
    // Already on the brake with the throttle open before the tree starts.
    r = advanceRace(models, r, { ...WOT, brakePressed: true }, 0.5);
    expect(r.player.sim.engineRpm).toBeGreaterThan(manual.engine.idleRpm * 2);
    const finished = runRace(models, r, (cur) => ({
      throttlePressed: true,
      brakePressed: !afterGreen(cur),
      clutchPressed: false,
    }));
    const result = raceResult(finished).player;
    expect(finished.player.sim.engineRunning).toBe(true);
    expect(result.falseStart).toBe(false);
    expect(result.finished).toBe(true);
  });

  it('full manual: dumping into gear with no clutch stalls on the line', () => {
    let r = createRace(models, setup());
    r = advanceRace(models, r, { ...IDLE, clutchPressed: true }, 0.1);
    r = shiftPlayer(models, r, 1);
    r = advanceRace(models, r, IDLE, 1);
    expect(r.player.sim.engineRunning).toBe(false);
  });

  it('times out the trailing bike as a DNF', () => {
    // Player never leaves neutral: opponent finishes, player DNFs after the grace period.
    const r = runRace(models, createRace(models, setup()), () => IDLE);
    const result = raceResult(r);
    expect(result.winner).toBe('opponent');
    expect(result.reason).toBe('dnf');
    expect(r.player.input).toEqual(NEUTRAL_INPUT);
  });
});

describe('scooter opponent', () => {
  it('brake-stands through the countdown without creeping, and reacts faster for it', () => {
    const models = { player: scooter, opponent: scooter };
    let r = startCountdown(createRace(models, setup('pro')));
    let maxRpmBeforeGreen = 0;
    while (r.clockS < r.tree.greenAtS) {
      r = stepRace(models, r, NEUTRAL_INPUT);
      maxRpmBeforeGreen = Math.max(maxRpmBeforeGreen, r.opponent.sim.engineRpm);
    }
    expect(r.opponent.sim.distanceM).toBe(0);
    expect(r.opponent.falseStart).toBe(false);
    expect(maxRpmBeforeGreen).toBeGreaterThan(scooter.engine.idleRpm + 1000);

    const done = runRace(models, r, () => IDLE);
    const reaction = raceResult(done).opponent.reactionS ?? Infinity;
    expect(reaction).toBeLessThan(0.7);
  });
});

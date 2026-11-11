import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { CIRCUIT_SKILLS } from '../circuit/circuitAi';
import { startLights } from '../circuit/circuitRace';
import { buildCircuit, sampleAt } from '../circuit/geometry';
import { buildModel } from '../simulation/model';
import { boxAt, boxReady, placeBoxes, takeBox } from './itemBoxes';
import { effectSpeed, landHit, landSkate, NO_EFFECTS } from './itemEffects';
import { createItemRace, type ItemRaceState } from './itemRace';
import { mixSeed, rollItem } from './itemRoll';
import { stepItemRace } from './itemStep';
import { ITEM_TUNING as T, type ItemId } from './itemTypes';
import { applyRemoteUse, fireItem } from './itemUse';
import { launchShot, stepShots } from './projectiles';
import { dropTrap, liveTraps, trapUnder } from './traps';

/** ~1.1 km loop, gentle corners. */
const geo = buildCircuit(
  Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return { x: 220 * Math.cos(a), z: 140 * Math.sin(a) };
  }),
  7,
);
const model = buildModel(makeConfig((t) => t, MANUAL_TEST_BIKE));
const settings = {
  laps: 1,
  limits: { halfWidth: 7, runoffM: 15, gripG: 1.2 },
  assist: true,
  brakeAssist: false,
  autoShift: true,
};
const race = (riders: number, seed = 7) =>
  createItemRace(
    geo,
    Array.from({ length: riders }, () => model),
    {
      settings,
      aiSkills: Array.from({ length: riders - 1 }, () => CIRCUIT_SKILLS.average),
      holdS: 0.5,
    },
    seed,
  );
/** Racing, with rider i holding `item` ready to use. */
function holding(state: ItemRaceState, i: number, item: ItemId): ItemRaceState {
  return {
    ...state,
    race: { ...state.race, phase: 'racing', clockS: 10 },
    holders: state.holders.map((h, k) => (k === i ? { ...h, item, charges: 1, readyAtS: 0 } : h)),
  };
}
const at = (state: ItemRaceState, i: number, s: number, d = 0, progressM = s) => ({
  ...state,
  race: {
    ...state.race,
    riders: state.race.riders.map((r, k) =>
      k === i ? { ...r, lat: { ...r.lat, s, d }, progressM } : r,
    ),
  },
});

describe('item roll', () => {
  it('the same seed gives the same item', () => {
    expect(rollItem(42, 2, 4).item).toBe(rollItem(42, 2, 4).item);
  });

  it('the leader never gets the skateboard; the back gets far more boosts', () => {
    const count = (place: number, ids: readonly ItemId[]) => {
      let n = 0;
      for (let k = 0; k < 3000; k++) if (ids.includes(rollItem(mixSeed(k), place, 4).item)) n++;
      return n;
    };
    expect(count(1, ['skateboard'])).toBe(0);
    expect(count(4, ['nitro', 'triple-boost'])).toBeGreaterThan(
      2.5 * count(1, ['nitro', 'triple-boost']),
    );
  });
});

describe('item effects', () => {
  it('a hit eases the speed to half over 1.5 s, then the bike pulls away again', () => {
    const { effects } = landHit(NO_EFFECTS, 0, 30);
    expect(effectSpeed(effects, T.hitS - 0.01, 30, 1 / 240)).toBeCloseTo(15, 0);
    expect(effectSpeed(effects, T.hitS + 0.1, 30, 1 / 240)).toBe(30);
    // Still reeling: another hit doesn't land.
    expect(landHit(effects, 1, 20).landed).toBe('missed');
  });

  it('the shield takes one hit and is gone', () => {
    const shield = { ...NO_EFFECTS, shieldUntilS: 8 };
    const first = landHit(shield, 1, 30);
    expect(first.landed).toBe('blocked');
    expect(landHit(first.effects, 1.1, 30).landed).toBe('hit');
  });

  it('the skateboard caps the speed for ten seconds', () => {
    const { effects } = landSkate(NO_EFFECTS, 0);
    expect(effectSpeed(effects, 5, 30, 1 / 240)).toBe(T.skateTopMps);
    expect(effectSpeed(effects, T.skateS + 0.01, 30, 1 / 240)).toBe(30);
  });
});

describe('item boxes', () => {
  const boxes = placeBoxes(geo);

  it('sit in rows clear of the start line', () => {
    expect(boxes.length).toBeGreaterThanOrEqual(9);
    for (const b of boxes) {
      expect(b.s).toBeGreaterThan(149);
      expect(b.s).toBeLessThan(geo.length - 149);
      expect(Math.abs(b.d)).toBeLessThan(geo.halfWidth);
    }
  });

  it('are picked up when ridden through and are back three seconds later', () => {
    const box = boxes[0];
    if (!box) throw new Error('no boxes');
    const i = boxAt(geo, boxes, box.s, box.d, 5);
    expect(i).toBe(0);
    const taken = takeBox(boxes, i, 5);
    expect(boxAt(geo, taken, box.s, box.d, 6)).toBe(-1);
    expect(boxReady(taken[0] ?? box, 5 + T.boxRespawnS)).toBe(true);
  });
});

describe('traps and shots', () => {
  it('oil catches whoever rides over it, but not its owner straight away', () => {
    const oil = dropTrap(geo, 'oil', 100, 0, 10, 1, 'x');
    expect(trapUnder(geo, [oil], oil.s, 0.5, 10.2, 2)).toBe(oil);
    expect(trapUnder(geo, [oil], oil.s, 0.5, 10.2, 1)).toBeNull();
    expect(trapUnder(geo, [oil], oil.s, 5, 10.2, 2)).toBeNull();
    expect(liveTraps([oil], 10 + T.oilLifeS + 1)).toHaveLength(0);
  });

  it('a water balloon hits the bike in its lane ahead', () => {
    const shot = launchShot(geo, 'water-balloon', 100, 1, 20, 0, 0, null, 'w');
    let shots = [shot];
    let hit = null;
    for (let k = 0; k < 720 && !hit; k++) {
      const step = stepShots(geo, shots, [{ key: 1, s: 150, d: 1.3 }], k / 240, 1 / 240);
      shots = [...step.shots];
      hit = step.hits[0] ?? null;
    }
    expect(hit?.key).toBe(1);
  });

  it('a paper plane closes in across the track on its target', () => {
    let shots = [launchShot(geo, 'homing', 100, -5, 20, 0, 0, 1, 'h')];
    let hit = null;
    for (let k = 0; k < 960 && !hit; k++) {
      const step = stepShots(geo, shots, [{ key: 1, s: 220, d: 5 }], k / 240, 1 / 240);
      shots = [...step.shots];
      hit = step.hits[0] ?? null;
    }
    expect(hit?.key).toBe(1);
  });
});

describe('using items', () => {
  it('the skateboard goes on the leader', () => {
    const state = at(at(holding(race(3), 2, 'skateboard'), 1, 400), 2, 200);
    const out = fireItem(geo, state, 2);
    expect(out.used?.target).toBe(1);
    expect(out.state.effects[1]?.skateUntilS).toBeGreaterThan(10);
    expect(out.state.holders[2]?.item).toBeNull();
  });

  it('three boosts from one triple boost', () => {
    let state = holding(race(1), 0, 'triple-boost');
    state = { ...state, holders: [{ item: 'triple-boost', charges: 3, readyAtS: 0, uses: 0 }] };
    for (let k = 0; k < 3; k++) {
      state = fireItem(geo, state, 0).state;
      state = { ...state, race: { ...state.race, clockS: state.race.clockS + 1 } };
    }
    expect(state.holders[0]?.item).toBeNull();
    expect(state.holders[0]?.uses).toBe(3);
  });

  it("another player's paper plane at you is chased here too", () => {
    const state = holding(race(1), 0, 'shield');
    const out = applyRemoteUse(
      geo,
      state,
      'p2',
      { item: 'homing', objectId: 'p2:1', s: 50, d: 0, speedMps: 30, target: 'me' },
      'me',
    );
    expect(out.shots[0]?.target).toBe(0);
  });
});

describe('an item race against the AI', () => {
  it('the AI pick up and use items, and everyone finishes', () => {
    const models = [model, model, model];
    let state = race(3, 3);
    state = { ...state, race: startLights(state.race) };
    const idle = { throttle: 0, brake: 0, clutchLever: 0 };
    const used = new Set<number>();
    const picked = new Set<number>();
    for (let k = 0; k < 240 * 200; k++) {
      state = stepItemRace(geo, models, state, idle, 0);
      for (const e of state.events) {
        if (e.type === 'use') used.add(e.rider);
        if (e.type === 'pick') picked.add(e.rider);
      }
      if (state.race.riders.slice(1).every((r) => r.finishedAtS !== null)) break;
    }
    expect(picked.has(1) || picked.has(2)).toBe(true);
    expect(used.has(1) || used.has(2)).toBe(true);
    expect(state.race.riders.slice(1).every((r) => r.finishedAtS !== null)).toBe(true);
    expect(sampleAt(geo, 0).s).toBe(0);
  });
});

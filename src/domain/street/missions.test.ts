import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../test/fixtures/simConfig';
import { TEST_CITY_DATA, TEST_CITY_OPTIONS } from '../../test/fixtures/testCity';
import { buildModel } from '../simulation/model';
import { buildCity } from './cityBuild';
import {
  missionLimitS,
  missionStars,
  missionTimeS,
  MISSION_SLACK_S,
  startMission,
  stepMission,
} from './missions';
import { advanceStreet, startStreetMission, clearStreetDestination } from './streetRide';

describe('mission rules', () => {
  it('allows town pace plus slack, rounded up', () => {
    expect(missionLimitS(0)).toBe(MISSION_SLACK_S);
    expect(missionLimitS(830)).toBe(100 + MISSION_SLACK_S);
  });

  it('stars: 70 %, 85 %, the limit, then none', () => {
    expect(missionStars(69, 100)).toBe(3);
    expect(missionStars(80, 100)).toBe(2);
    expect(missionStars(100, 100)).toBe(1);
    expect(missionStars(101, 100)).toBe(0);
  });

  it('counts crashes and stops the clock on arrival, once', () => {
    let run = startMission('x', 10, 830);
    run = stepMission(run, 20, false, true);
    expect(run.crashes).toBe(1);
    run = stepMission(run, 40, true, false);
    expect(run.finishedAtS).toBe(40);
    expect(stepMission(run, 50, true, true)).toBe(run);
    expect(missionTimeS(run, 99)).toBe(30);
  });
});

describe('a street mission', () => {
  const map = buildCity(TEST_CITY_DATA, TEST_CITY_OPTIONS);
  const scooter = buildModel(makeConfig());
  const settings = { gripG: 1.05, autoShift: true, autoClutch: false, trafficCount: 0, seed: 1 };
  const idle = {
    throttlePressed: false,
    brakePressed: false,
    clutchPressed: false,
    steerLeftPressed: false,
    steerRightPressed: false,
    reversePressed: false,
  };

  it('starts at the station with the sat-nav set and the clock running', () => {
    const s = startStreetMission(map, scooter, settings, 'south', { x: 0, z: 330, label: '南邊' });
    if (!s) throw new Error('no route');
    expect(s.rider.x).toBe(map.spawn.x);
    expect(s.nav?.route.lengthM).toBeGreaterThan(100);
    expect(s.mission?.limitS).toBe(missionLimitS(s.nav?.route.lengthM ?? 0));
    expect(s.mission?.finishedAtS).toBeNull();
  });

  it('finishes on arrival; cancelling the sat-nav abandons it', () => {
    const s0 = startStreetMission(map, scooter, settings, 'south', { x: 0, z: 330, label: '南邊' });
    if (!s0) throw new Error('no route');
    const end = s0.nav?.route.end ?? { x: 0, z: 330 };
    // Put the rider at the door and let the sat-nav notice.
    let s = { ...s0, rider: { ...s0.rider, x: end.x, z: end.z } };
    for (let i = 0; i < 30; i++) s = advanceStreet(map, scooter, s, idle, 1 / 60);
    expect(s.nav?.arrived).toBe(true);
    expect(s.mission?.finishedAtS).not.toBeNull();
    expect(clearStreetDestination(s).mission).toBeNull();
  });
});

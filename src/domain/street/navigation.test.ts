import { describe, expect, it } from 'vitest';
import { TEST_CITY_DATA, TEST_CITY_OPTIONS } from '../../test/fixtures/testCity';
import { buildCity } from './cityBuild';
import { turnKind } from './maneuvers';
import { nextStep, OFF_ROUTE_M, startNavigation, updateNavigation } from './navigation';
import { findRoute } from './routing';

const map = buildCity(TEST_CITY_DATA, TEST_CITY_OPTIONS);
const DEG = Math.PI / 180;

describe('turn kinds', () => {
  it('reads a negative heading change as left (z points south)', () => {
    expect(turnKind(0)).toBe('straight');
    expect(turnKind(-90 * DEG)).toBe('left');
    expect(turnKind(90 * DEG)).toBe('right');
    expect(turnKind(-40 * DEG)).toBe('slight-left');
    expect(turnKind(40 * DEG)).toBe('slight-right');
    expect(turnKind(175 * DEG)).toBe('uturn');
  });
});

describe('routing (A*)', () => {
  it('finds the shortest way between two points on the grid', () => {
    const route = findRoute(map, { x: 0, z: 60 }, { x: 240, z: 300 });
    expect(route).not.toBeNull();
    // Grid (Manhattan) distance: 240 across + 240 down.
    expect(route?.lengthM).toBeGreaterThan(475);
    expect(route?.lengthM).toBeLessThan(500);
    expect(route?.end.x).toBeCloseTo(240, 0);
    expect(route?.end.z).toBeCloseTo(300, 0);
  });

  it('stays on one edge when start and end share it', () => {
    const route = findRoute(map, { x: 0, z: 20 }, { x: 0, z: 100 });
    expect(route?.legs).toHaveLength(1);
    expect(route?.lengthM).toBeCloseTo(80, 0);
    expect(route?.maneuvers.map((m) => m.kind)).toEqual(['arrive']);
  });

  it('keeps to one-way streets', () => {
    // 單行巷 (x = 360) only runs south. Going north along it is not allowed,
    // so the route must use another road; going south it may use it.
    const north = findRoute(map, { x: 360, z: 330 }, { x: 360, z: 30 });
    const south = findRoute(map, { x: 360, z: 30 }, { x: 360, z: 330 });
    expect(south?.lengthM).toBeCloseTo(300, 0);
    expect(north?.lengthM).toBeGreaterThan(500);
    const lane = map.edges.filter((e) => e.name === '單行巷').map((e) => e.id);
    for (const leg of north?.legs ?? []) {
      if (lane.includes(leg.edge)) expect(leg.forward).toBe(true);
    }
  });

  it('gives turn-by-turn instructions with road names', () => {
    // East along 東西1路, then right (south) onto 南北2路: the only shortest way.
    const route = findRoute(map, { x: 20, z: 120 }, { x: 240, z: 180 });
    const turns = route?.maneuvers ?? [];
    expect(turns[0]).toMatchObject({ kind: 'right', road: '南北2路' });
    expect(turns[0]?.atM).toBeCloseTo(220, -1);
    expect(turns[turns.length - 1]?.kind).toBe('arrive');
  });
});

describe('navigation', () => {
  const dest = { x: 240, z: 180, label: '目的地' };

  it('tracks progress and the next instruction', () => {
    const nav = startNavigation(map, { x: 20, z: 120 }, dest);
    if (!nav) throw new Error('no route');
    const step0 = nextStep(nav);
    expect(step0.maneuver.kind).toBe('right');
    const moved = updateNavigation(map, nav, 120, 122);
    expect(moved.progressM).toBeGreaterThan(90);
    expect(nextStep(moved).distanceM).toBeLessThan(step0.distanceM);
    expect(moved.arrived).toBe(false);
  });

  it('re-plans when the rider leaves the route', () => {
    const nav = startNavigation(map, { x: 20, z: 120 }, dest);
    if (!nav) throw new Error('no route');
    const off = updateNavigation(map, nav, 60, 120 - OFF_ROUTE_M - 100);
    expect(off.reroutes).toBe(1);
    expect(off.route).not.toBe(nav.route);
  });

  it('notices arrival', () => {
    const nav = startNavigation(map, { x: 20, z: 120 }, dest);
    if (!nav) throw new Error('no route');
    const there = updateNavigation(map, nav, 240, 175);
    expect(there.arrived).toBe(true);
    expect(nextStep(there).remainingM).toBe(0);
  });
});

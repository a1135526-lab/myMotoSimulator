import type { CityMap } from './city';
import { closestOnSegment, type Vec2 } from './geometry2d';
import type { Maneuver } from './maneuvers';
import { findRoute, type Route } from './routing';

/**
 * Following a route: where along it the rider is, the next instruction,
 * re-planning when they leave it and noticing when they've arrived.
 */

/** Further than this from the route counts as off it. */
export const OFF_ROUTE_M = 25;
/** Within this of the destination counts as there. */
export const ARRIVE_M = 20;
/** How far behind / ahead of the last fix to look for the rider on the route. */
const SEARCH_BACK_M = 40;
const SEARCH_AHEAD_M = 250;

export interface Destination {
  readonly x: number;
  readonly z: number;
  readonly label: string;
}

export interface NavState {
  readonly destination: Destination;
  readonly route: Route;
  /** Distance along the route ridden so far. */
  readonly progressM: number;
  readonly offRouteM: number;
  readonly arrived: boolean;
  /** Times the route has been re-planned. */
  readonly reroutes: number;
}

export function startNavigation(
  map: CityMap,
  from: Vec2,
  destination: Destination,
): NavState | null {
  const route = findRoute(map, from, destination);
  if (!route) return null;
  return { destination, route, progressM: 0, offRouteM: 0, arrived: false, reroutes: 0 };
}

/** Closest point on the route to (x, z), near the last known progress. */
export function locateOnRoute(route: Route, x: number, z: number, near: number) {
  let best = { s: near, d: Infinity };
  for (let i = 0; i + 1 < route.points.length; i++) {
    const c0 = route.cum[i] ?? 0;
    const c1 = route.cum[i + 1] ?? 0;
    if (c1 < near - SEARCH_BACK_M || c0 > near + SEARCH_AHEAD_M) continue;
    const p = route.points[i] as Vec2;
    const q = route.points[i + 1] as Vec2;
    const h = closestOnSegment(x, z, p.x, p.z, q.x, q.z);
    if (h.d < best.d) best = { s: c0 + h.t * (c1 - c0), d: h.d };
  }
  return best;
}

export function updateNavigation(map: CityMap, nav: NavState, x: number, z: number): NavState {
  if (nav.arrived) return nav;
  const fix = locateOnRoute(nav.route, x, z, nav.progressM);
  const toEnd = Math.hypot(nav.route.end.x - x, nav.route.end.z - z);
  if (toEnd < ARRIVE_M || nav.route.lengthM - fix.s < ARRIVE_M * 0.5) {
    return { ...nav, progressM: nav.route.lengthM, offRouteM: 0, arrived: true };
  }
  if (fix.d > OFF_ROUTE_M) {
    const route = findRoute(map, { x, z }, nav.destination);
    if (route) return { ...nav, route, progressM: 0, offRouteM: 0, reroutes: nav.reroutes + 1 };
  }
  // Progress only moves forward (riding back a few metres isn't "undoing" it).
  return { ...nav, progressM: Math.max(nav.progressM, fix.s), offRouteM: fix.d };
}

export interface NextStep {
  readonly maneuver: Maneuver;
  readonly distanceM: number;
  readonly remainingM: number;
}

export function nextStep(nav: NavState): NextStep {
  const list = nav.route.maneuvers;
  const maneuver =
    list.find((m) => m.atM > nav.progressM + 1) ?? (list[list.length - 1] as Maneuver);
  return {
    maneuver,
    distanceM: Math.max(0, maneuver.atM - nav.progressM),
    remainingM: Math.max(0, nav.route.lengthM - nav.progressM),
  };
}

import type { CityMap, RoadClass, RoadEdge } from './city';
import { nearestOnRoad, type RoadHit } from './cityQueries';
import { dist, type Vec2 } from './geometry2d';
import { maneuversFor, type Maneuver } from './maneuvers';
import { otherEnd, pointAlong } from './roadNetwork';

/**
 * Shortest ride between two points on the road network (A*), keeping to
 * one-way streets. Start and end can be anywhere along a road: they join the
 * graph at both ends of their own edge.
 */

export interface RouteLeg {
  readonly edge: number;
  /** Travelling a → b. */
  readonly forward: boolean;
  /** Distances along the edge from its node a. */
  readonly from: number;
  readonly to: number;
}

export interface Route {
  readonly legs: readonly RouteLeg[];
  readonly points: readonly Vec2[];
  readonly cum: readonly number[];
  readonly lengthM: number;
  readonly maneuvers: readonly Maneuver[];
  /** Where the route ends, on the road. */
  readonly end: Vec2;
}

/** Mild preference for main roads, like a real sat-nav (≥ 1 keeps A* exact). */
const ROAD_COST: Readonly<Record<RoadClass, number>> = {
  primary: 1,
  secondary: 1,
  tertiary: 1.05,
  unclassified: 1.1,
  residential: 1.25,
  living_street: 1.4,
  link: 1,
};

interface Entry {
  readonly node: number;
  readonly g: number;
  readonly f: number;
}

/** Tiny binary min-heap on f. */
class Heap {
  private readonly items: Entry[] = [];
  get size() {
    return this.items.length;
  }
  push(e: Entry) {
    const a = this.items;
    a.push(e);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if ((a[p] as Entry).f <= e.f) break;
      a[i] = a[p] as Entry;
      i = p;
    }
    a[i] = e;
  }
  pop(): Entry | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0 && last) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        let mf = last.f;
        if (l < a.length && (a[l] as Entry).f < mf) [m, mf] = [l, (a[l] as Entry).f];
        if (r < a.length && (a[r] as Entry).f < mf) m = r;
        if (m === i) break;
        a[i] = a[m] as Entry;
        i = m;
      }
      a[i] = last;
    }
    return top;
  }
}

/** Points of an edge between two distances along it, in travel order. */
export function sliceEdge(edge: RoadEdge, from: number, to: number): Vec2[] {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const pts: Vec2[] = [pointAlong(edge, lo)];
  edge.points.forEach((p, i) => {
    const c = edge.cum[i] ?? 0;
    if (c > lo && c < hi) pts.push(p);
  });
  const last = pointAlong(edge, hi);
  pts.push({ x: last.x, z: last.z });
  const out = pts.map((p) => ({ x: p.x, z: p.z }));
  return from <= to ? out : out.reverse();
}

const GOAL = -1;
const START = -2;

function search(map: CityMap, start: RoadHit, end: RoadHit): RouteLeg[] | null {
  const se = start.edge;
  const ee = end.edge;
  if (se.id === ee.id && (end.s >= start.s || !se.oneway)) {
    return [{ edge: se.id, forward: end.s >= start.s, from: start.s, to: end.s }];
  }
  // Straight-line distance never overestimates (every road costs ≥ its length).
  const h = (n: number) => {
    const p = map.nodes[n];
    return p ? Math.hypot(p.x - end.x, p.z - end.z) : 0;
  };
  const best = new Map<number, number>();
  const came = new Map<number, { prev: number; leg: RouteLeg }>();
  const heap = new Heap();
  const offer = (node: number, g: number, prev: number, leg: RouteLeg) => {
    if (g >= (best.get(node) ?? Infinity)) return;
    best.set(node, g);
    came.set(node, { prev, leg });
    heap.push({ node, g, f: g + (node === GOAL ? 0 : h(node)) });
  };
  const cost = (e: RoadEdge, m: number) => m * ROAD_COST[e.cls];
  offer(se.b, cost(se, se.length - start.s), START, {
    edge: se.id,
    forward: true,
    from: start.s,
    to: se.length,
  });
  if (!se.oneway)
    offer(se.a, cost(se, start.s), START, { edge: se.id, forward: false, from: start.s, to: 0 });

  while (heap.size > 0) {
    const cur = heap.pop() as Entry;
    if (cur.g > (best.get(cur.node) ?? Infinity)) continue;
    if (cur.node === GOAL) break;
    // Finish along the destination's own edge.
    if (cur.node === ee.a)
      offer(GOAL, cur.g + cost(ee, end.s), cur.node, {
        edge: ee.id,
        forward: true,
        from: 0,
        to: end.s,
      });
    if (cur.node === ee.b && !ee.oneway)
      offer(GOAL, cur.g + cost(ee, ee.length - end.s), cur.node, {
        edge: ee.id,
        forward: false,
        from: ee.length,
        to: end.s,
      });
    for (const id of map.nodes[cur.node]?.edges ?? []) {
      const e = map.edges[id] as RoadEdge;
      if (e.a === e.b) continue;
      const forward = e.a === cur.node;
      if (!forward && e.oneway) continue;
      offer(otherEnd(e, cur.node), cur.g + cost(e, e.length), cur.node, {
        edge: id,
        forward,
        from: forward ? 0 : e.length,
        to: forward ? e.length : 0,
      });
    }
  }
  if (!came.has(GOAL)) return null;
  const legs: RouteLeg[] = [];
  for (let n = GOAL; n !== START;) {
    const step = came.get(n);
    if (!step) return null;
    legs.push(step.leg);
    n = step.prev;
  }
  return legs.reverse();
}

export function routeFromLegs(map: CityMap, legs: readonly RouteLeg[]): Route {
  const points: Vec2[] = [];
  for (const leg of legs) {
    const pts = sliceEdge(map.edges[leg.edge] as RoadEdge, leg.from, leg.to);
    for (const p of pts) {
      const last = points[points.length - 1];
      if (!last || dist(last, p) > 0.05) points.push(p);
    }
  }
  const cum = [0];
  for (let i = 1; i < points.length; i++)
    cum.push((cum[i - 1] ?? 0) + dist(points[i - 1] as Vec2, points[i] as Vec2));
  const lengthM = cum[cum.length - 1] ?? 0;
  return {
    legs,
    points,
    cum,
    lengthM,
    maneuvers: maneuversFor(map, legs, lengthM),
    end: points[points.length - 1] ?? { x: 0, z: 0 },
  };
}

export function findRoute(map: CityMap, from: Vec2, to: Vec2): Route | null {
  const start = nearestOnRoad(map, from.x, from.z);
  const end = nearestOnRoad(map, to.x, to.z);
  if (!start || !end) return null;
  const legs = search(map, start, end);
  return legs ? routeFromLegs(map, legs) : null;
}

import { gapAlong } from '../circuit/contacts';
import { wrapS, type CircuitGeometry } from '../circuit/geometry';
import { ITEM_TUNING as T } from './itemTypes';
import type { Owner } from './traps';

/**
 * Shots: a water balloon flies straight down its lane; a paper plane chases
 * the rider it was aimed at, closing in across the track. Both run along the
 * track in (s, d), so every device moves them the same way from the launch.
 */
export interface Shot {
  readonly id: string;
  readonly kind: 'water-balloon' | 'homing';
  readonly s: number;
  readonly d: number;
  readonly speedMps: number;
  readonly bornS: number;
  readonly travelledM: number;
  readonly owner: Owner;
  /** Who a paper plane is after (null: it just flies on). */
  readonly target: Owner | null;
}

/** A bike a shot can hit. */
export interface Target {
  readonly key: Owner;
  readonly s: number;
  readonly d: number;
}

export function launchShot(
  geo: CircuitGeometry,
  kind: Shot['kind'],
  s: number,
  d: number,
  riderMps: number,
  clockS: number,
  owner: Owner,
  target: Owner | null,
  id: string,
): Shot {
  const fast = riderMps + T.waterExtraMps;
  const speedMps = kind === 'homing' ? Math.max(T.homingMps, fast) : fast;
  return {
    id,
    kind,
    s: wrapS(geo, s + 2),
    d,
    speedMps,
    bornS: clockS,
    travelledM: 0,
    owner,
    target,
  };
}

const alive = (shot: Shot, clockS: number) =>
  shot.kind === 'homing'
    ? clockS < shot.bornS + T.homingLifeS
    : clockS < shot.bornS + T.waterLifeS && shot.travelledM < T.waterRangeM;

export interface ShotStep {
  readonly shots: readonly Shot[];
  readonly hits: readonly { readonly shot: Shot; readonly key: Owner }[];
}

export function stepShots(
  geo: CircuitGeometry,
  shots: readonly Shot[],
  targets: readonly Target[],
  clockS: number,
  dt: number,
): ShotStep {
  if (shots.length === 0) return { shots, hits: [] };
  const out: Shot[] = [];
  const hits: { shot: Shot; key: Owner }[] = [];
  for (const shot of shots) {
    if (!alive(shot, clockS)) continue;
    const chase = shot.target === null ? null : targets.find((t) => t.key === shot.target);
    let d = shot.d;
    if (shot.kind === 'homing' && chase) {
      const step = T.homingSideMps * dt;
      d += Math.max(-step, Math.min(step, chase.d - d));
    }
    const moved: Shot = {
      ...shot,
      s: wrapS(geo, shot.s + shot.speedMps * dt),
      d,
      travelledM: shot.travelledM + shot.speedMps * dt,
    };
    const struck = targets.find(
      (t) =>
        t.key !== shot.owner &&
        Math.abs(gapAlong(geo, moved.s, t.s)) < T.shotHitS &&
        Math.abs(moved.d - t.d) < T.shotHitD,
    );
    if (struck) hits.push({ shot: moved, key: struck.key });
    else out.push(moved);
  }
  return { shots: out, hits };
}

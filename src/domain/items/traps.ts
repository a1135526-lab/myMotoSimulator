import { gapAlong, type ContactBody } from '../circuit/contacts';
import { wrapS, type CircuitGeometry } from '../circuit/geometry';
import { ITEM_TUNING as T } from './itemTypes';

/**
 * Things left on the track: oil (a hit), tacks (a slow-down) and cones (solid,
 * bumped like another bike), plus smoke screens. Track coordinates (s, d).
 * `owner` is a local rider's index or another player's id.
 */
export type Owner = number | string;

export type TrapKind = 'oil' | 'tacks' | 'cone';

export interface Trap {
  readonly id: string;
  readonly kind: TrapKind;
  readonly s: number;
  readonly d: number;
  readonly bornS: number;
  readonly owner: Owner;
}

export interface Smoke {
  readonly id: string;
  /** The screen runs from here back SMOKE_LENGTH_M along the track. */
  readonly s: number;
  readonly untilS: number;
  readonly owner: Owner;
}

const LIFE: Readonly<Record<TrapKind, number>> = {
  oil: T.oilLifeS,
  tacks: T.tacksLifeS,
  cone: T.coneLifeS,
};

/** Dropped just behind the rider. */
export function dropTrap(
  geo: CircuitGeometry,
  kind: TrapKind,
  s: number,
  d: number,
  clockS: number,
  owner: Owner,
  id: string,
): Trap {
  return { id, kind, s: wrapS(geo, s - T.trapBehindM), d, bornS: clockS, owner };
}

export const liveTraps = (traps: readonly Trap[], clockS: number): readonly Trap[] => {
  const live = traps.filter((t) => clockS < t.bornS + LIFE[t.kind]);
  return live.length === traps.length ? traps : live;
};

/** Oil or tacks under a bike at (s, d); cones are solid and handled as contacts. */
export function trapUnder(
  geo: CircuitGeometry,
  traps: readonly Trap[],
  s: number,
  d: number,
  clockS: number,
  who: Owner,
): Trap | null {
  for (const t of traps) {
    if (t.kind === 'cone') continue;
    if (t.owner === who && clockS < t.bornS + T.ownTrapGraceS) continue;
    const along = Math.abs(gapAlong(geo, s, t.s));
    const across = Math.abs(d - t.d);
    const reach =
      t.kind === 'oil'
        ? along < T.oilRadiusM && across < T.oilRadiusM
        : along < T.tacksLengthM && across < geo.halfWidth / 2;
    if (reach) return t;
  }
  return null;
}

/** Cones as standing bikes for the contact solver. */
export const coneBodies = (traps: readonly Trap[]): ContactBody[] =>
  traps.filter((t) => t.kind === 'cone').map((t) => ({ s: t.s, d: t.d, psi: 0, speedMps: 0 }));

export const liveSmokes = (smokes: readonly Smoke[], clockS: number): readonly Smoke[] => {
  const live = smokes.filter((m) => clockS < m.untilS);
  return live.length === smokes.length ? smokes : live;
};

/** Is a rider at s inside someone else's smoke? */
export function inSmoke(
  geo: CircuitGeometry,
  smokes: readonly Smoke[],
  s: number,
  who: Owner,
): boolean {
  return smokes.some((m) => {
    if (m.owner === who) return false;
    const behind = -gapAlong(geo, m.s, s);
    return behind >= 0 && behind <= T.smokeLengthM;
  });
}

import { gapAlong } from '../circuit/contacts';
import { wrapS, type CircuitGeometry } from '../circuit/geometry';
import { landSkate, startBoost } from './itemEffects';
import { addEvent, newId, updateRider, type ItemRaceState, type RemoteBody } from './itemRace';
import { ITEM_TUNING as T, type ItemId } from './itemTypes';
import { launchShot } from './projectiles';
import { dropTrap, type Owner } from './traps';

/** What went out onto the track: enough for another device to make the same thing. */
export interface ItemUse {
  readonly item: ItemId;
  /** The trap / shot / smoke made (null for boosts, shield, flash, skateboard). */
  readonly objectId: string | null;
  readonly s: number;
  readonly d: number;
  readonly speedMps: number;
  /** Paper plane / skateboard: who it's after. */
  readonly target: Owner | null;
}

const TAN_BEAM = Math.tan(Math.acos(T.flashConeCos));

/** Is (s, d) in the beam of a bike at (fromS, fromD) riding the lap? */
export function inBeam(
  geo: CircuitGeometry,
  fromS: number,
  fromD: number,
  s: number,
  d: number,
): boolean {
  const gap = gapAlong(geo, fromS, s);
  return gap > 0 && gap <= T.flashRangeM && Math.abs(d - fromD) <= gap * TAN_BEAM;
}

interface Rival {
  readonly key: Owner;
  readonly progressM: number;
}

function rivals(state: ItemRaceState, i: number, remote: readonly RemoteBody[]): Rival[] {
  return [
    ...state.race.riders
      .map((r, k) => ({ key: k as Owner, progressM: r.progressM }))
      .filter((r) => r.key !== i),
    ...remote.map((r) => ({ key: r.id as Owner, progressM: r.progressM })),
  ];
}

/** The leader among everyone else (the skateboard's target), or null. */
export function leaderBesides(
  state: ItemRaceState,
  i: number,
  remote: readonly RemoteBody[],
): Owner | null {
  const all = rivals(state, i, remote);
  return all.length ? all.reduce((a, b) => (b.progressM > a.progressM ? b : a)).key : null;
}

/** The rider right ahead in the order (a paper plane's target), or null when leading. */
export function nextAhead(
  state: ItemRaceState,
  i: number,
  remote: readonly RemoteBody[],
): Owner | null {
  const mine = state.race.riders[i]?.progressM ?? 0;
  const ahead = rivals(state, i, remote).filter((r) => r.progressM > mine);
  return ahead.length ? ahead.reduce((a, b) => (b.progressM < a.progressM ? b : a)).key : null;
}

export function canUse(state: ItemRaceState, i: number): boolean {
  const h = state.holders[i];
  const r = state.race.riders[i];
  return (
    !!h &&
    !!r &&
    h.item !== null &&
    state.race.phase === 'racing' &&
    r.finishedAtS === null &&
    state.race.clockS >= h.readyAtS &&
    h.uses < T.maxUsesPerRace
  );
}

/** Rider i uses what they hold. */
export function fireItem(
  geo: CircuitGeometry,
  state: ItemRaceState,
  i: number,
  remote: readonly RemoteBody[] = [],
): { state: ItemRaceState; used: ItemUse | null } {
  if (!canUse(state, i)) return { state, used: null };
  const holder = state.holders[i];
  const rider = state.race.riders[i];
  const effects = state.effects[i];
  if (!holder?.item || !rider || !effects) return { state, used: null };
  const item = holder.item;
  const clock = state.race.clockS;
  const { s, d } = rider.lat;
  const v = rider.sim.speedMps;
  const charges = holder.charges - 1;
  const spent = {
    ...holder,
    item: charges > 0 ? item : null,
    charges,
    readyAtS: clock + (charges > 0 ? 0.25 : 0),
    uses: holder.uses + 1,
  };
  let next = addEvent(updateRider(state, i, null, spent), { type: 'use', rider: i, item });
  let objectId: string | null = null;
  let target: Owner | null = null;

  switch (item) {
    case 'nitro':
      next = updateRider(next, i, startBoost(effects, clock, T.nitroS, T.nitroAccel));
      break;
    case 'triple-boost':
      next = updateRider(next, i, startBoost(effects, clock, T.tripleS, T.tripleAccel));
      break;
    case 'shield':
      next = updateRider(next, i, { ...effects, shieldUntilS: clock + T.shieldS });
      break;
    case 'oil':
    case 'tacks':
    case 'cone': {
      [objectId, next] = newId(next);
      next = { ...next, traps: [...next.traps, dropTrap(geo, item, s, d, clock, i, objectId)] };
      break;
    }
    case 'water-balloon':
    case 'homing': {
      [objectId, next] = newId(next);
      target = item === 'homing' ? nextAhead(next, i, remote) : null;
      const shot = launchShot(geo, item, s, d, v, clock, i, target, objectId);
      next = { ...next, shots: [...next.shots, shot] };
      break;
    }
    case 'smoke': {
      [objectId, next] = newId(next);
      const smoke = { id: objectId, s, untilS: clock + T.smokeS, owner: i };
      next = { ...next, smokes: [...next.smokes, smoke] };
      break;
    }
    case 'flash':
      next = dazzleAhead(geo, next, s, d, i);
      break;
    case 'skateboard': {
      target = leaderBesides(next, i, remote);
      next = target === null ? next : skate(next, target, i);
      break;
    }
  }
  return { state: next, used: { item, objectId, s, d, speedMps: v, target } };
}

/** The flash lights up the player if they're ahead in the beam (the AI don't mind). */
function dazzleAhead(
  geo: CircuitGeometry,
  state: ItemRaceState,
  s: number,
  d: number,
  by: Owner,
): ItemRaceState {
  const player = state.race.riders[0];
  if (by === 0 || !player || !inBeam(geo, s, d, player.lat.s, player.lat.d)) return state;
  return addEvent(state, { type: 'dazzle', rider: 0, by });
}

/** Skateboard the target: a rider here now; another player's own device does theirs. */
export function skate(state: ItemRaceState, target: Owner, by: Owner): ItemRaceState {
  if (typeof target !== 'number')
    return addEvent(state, { type: 'skate', target, by, landed: 'hit' });
  const e = state.effects[target];
  if (!e) return state;
  const out = landSkate(e, state.race.clockS);
  return addEvent(updateRider(state, target, out.effects), {
    type: 'skate',
    target,
    by,
    landed: out.landed,
  });
}

/**
 * Another player used an item: make the same trap / shot / smoke here, and
 * see whether their flash catches the player. `me` is this player's id.
 */
export function applyRemoteUse(
  geo: CircuitGeometry,
  state: ItemRaceState,
  owner: string,
  use: ItemUse,
  me: string | null,
): ItemRaceState {
  const clock = state.race.clockS;
  const id = use.objectId ?? `${owner}?`;
  const target = use.target === me && me !== null ? 0 : use.target;
  switch (use.item) {
    case 'oil':
    case 'tacks':
    case 'cone':
      return {
        ...state,
        traps: [...state.traps, dropTrap(geo, use.item, use.s, use.d, clock, owner, id)],
      };
    case 'water-balloon':
    case 'homing': {
      const shot = launchShot(geo, use.item, use.s, use.d, use.speedMps, clock, owner, target, id);
      return { ...state, shots: [...state.shots, shot] };
    }
    case 'smoke':
      return {
        ...state,
        smokes: [...state.smokes, { id, s: wrapS(geo, use.s), untilS: clock + T.smokeS, owner }],
      };
    case 'flash':
      return dazzleAhead(geo, state, use.s, use.d, owner);
    case 'skateboard':
      return target === 0 ? skate(state, 0, owner) : state;
    default:
      return state;
  }
}

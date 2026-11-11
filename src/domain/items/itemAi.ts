import { gapAlong } from '../circuit/contacts';
import type { CircuitGeometry } from '../circuit/geometry';
import { nextCorner } from '../circuit/corners';
import { mixSeed, nextRandom } from './itemRoll';
import { targetsOf, type ItemRaceState, type RemoteBody } from './itemRace';
import { canUse, inBeam, fireItem } from './itemUse';

/**
 * When the AI riders use what they hold:
 *   boosts      on a straight with no tight corner coming
 *   traps       with someone close behind
 *   water       with someone just ahead in the same lane
 *   plane, skateboard, smoke, flash   soon after the pick-up
 *   shield      when a shot is coming, else held
 */
const BOOST_CLEAR_M = 200;
const BEHIND_M = 60;
const AHEAD_M = 80;
const LANE_M = 3;
const SOON_S = 1.5;
/** Held this long without the right moment: use it anyway. */
const IDLE_USE_AFTER_S = 12;

export function aiUseItems(
  geo: CircuitGeometry,
  state: ItemRaceState,
  remote: readonly RemoteBody[],
): ItemRaceState {
  let next = state;
  for (let i = 1; i < state.race.riders.length; i++) {
    if (!canUse(next, i) || !wants(geo, next, i, remote)) continue;
    next = fireItem(geo, next, i, remote).state;
  }
  return next;
}

function wants(
  geo: CircuitGeometry,
  state: ItemRaceState,
  i: number,
  remote: readonly RemoteBody[],
): boolean {
  const holder = state.holders[i];
  const me = state.race.riders[i];
  if (!holder?.item || !me) return false;
  const clock = state.race.clockS;
  const held = clock - holder.readyAtS;
  // A little hesitation, different for every rider and item.
  const pause = nextRandom(mixSeed(state.seed, i, holder.uses)).value * SOON_S;
  if (held < pause) return false;
  if (held > IDLE_USE_AFTER_S) return true;
  const others = targetsOf(state, remote).filter((t) => t.key !== i);
  const gaps = others.map((t) => ({ t, gap: gapAlong(geo, me.lat.s, t.s) }));
  switch (holder.item) {
    case 'nitro':
    case 'triple-boost': {
      const corner = nextCorner(geo, state.race.corners, me.lat.s);
      return !corner || (corner.distanceM > BOOST_CLEAR_M && corner.distanceM > 0);
    }
    case 'oil':
    case 'tacks':
    case 'cone':
      return gaps.some(({ gap }) => gap < 0 && gap > -BEHIND_M);
    case 'water-balloon':
      return gaps.some(
        ({ t, gap }) => gap > 0 && gap < AHEAD_M && Math.abs(t.d - me.lat.d) < LANE_M,
      );
    case 'shield':
      return state.shots.some((s) => s.target === i);
    case 'flash':
      return others.some((t) => inBeam(geo, me.lat.s, me.lat.d, t.s, t.d));
    default:
      return true;
  }
}

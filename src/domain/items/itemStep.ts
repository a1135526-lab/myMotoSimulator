import type { ContactBody } from '../circuit/contacts';
import type { CircuitGeometry } from '../circuit/geometry';
import { stepCircuitRace } from '../circuit/circuitRace';
import type { SimModel } from '../simulation/model';
import type { SimInput } from '../simulation/types';
import { aiUseItems } from './itemAi';
import { boxAt, takeBox } from './itemBoxes';
import { effectSpeed, modelWithEffects, NO_EFFECTS } from './itemEffects';
import {
  addEvent,
  fieldSize,
  hitRider,
  placeOf,
  targetsOf,
  updateRider,
  type ItemRaceState,
  type RemoteBody,
} from './itemRace';
import { mixSeed, rollItem } from './itemRoll';
import { ITEM_TUNING as T } from './itemTypes';
import { stepShots } from './projectiles';
import { coneBodies, liveSmokes, liveTraps, trapUnder } from './traps';

/**
 * One fixed step of an item race: the circuit race with the items' effects on
 * each bike, then boxes, traps, shots and the AI's items.
 */
export function stepItemRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  state: ItemRaceState,
  playerInput: SimInput,
  steer: number,
  remote: readonly RemoteBody[] = [],
): ItemRaceState {
  const clock0 = state.race.clockS;
  const live = models.map((m, i) => modelWithEffects(m, state.effects[i] ?? NO_EFFECTS, clock0));
  const others: ContactBody[] = [...remote, ...coneBodies(state.traps)];
  const race = stepCircuitRace(geo, live, state.race, playerInput, steer, others);
  const dt = models[0]?.timestepS ?? 1 / 240;
  const clock = race.clockS;
  const riders = race.riders.map((r, i) => {
    const v = effectSpeed(state.effects[i] ?? NO_EFFECTS, clock, r.sim.speedMps, dt);
    return v === r.sim.speedMps ? r : { ...r, sim: { ...r.sim, speedMps: v } };
  });
  let next: ItemRaceState = { ...state, race: { ...race, riders } };
  if (race.phase !== 'racing' && race.phase !== 'finished') return next;

  next = pickUpBoxes(geo, next, remote);
  next = springTraps(geo, next);
  next = flyShots(geo, next, remote, dt);
  next = aiUseItems(geo, next, remote);
  const traps = liveTraps(next.traps, clock);
  const smokes = liveSmokes(next.smokes, clock);
  return traps === next.traps && smokes === next.smokes ? next : { ...next, traps, smokes };
}

function pickUpBoxes(
  geo: CircuitGeometry,
  state: ItemRaceState,
  remote: readonly RemoteBody[],
): ItemRaceState {
  const clock = state.race.clockS;
  let next = state;
  state.race.riders.forEach((r, i) => {
    const holder = next.holders[i];
    if (!holder || holder.item !== null || r.finishedAtS !== null) return;
    const box = boxAt(geo, next.boxes, r.lat.s, r.lat.d, clock);
    if (box < 0) return;
    const seed = mixSeed(next.seed, i, box, Math.floor(clock * 10));
    const { item } = rollItem(seed, placeOf(next, i, remote), fieldSize(next, remote));
    const charges = item === 'triple-boost' ? T.tripleCharges : 1;
    next = addEvent(
      {
        ...updateRider(next, i, null, { ...holder, item, charges, readyAtS: clock + T.rollS }),
        boxes: takeBox(next.boxes, box, clock),
      },
      { type: 'pick', rider: i, item },
    );
  });
  return next;
}

function springTraps(geo: CircuitGeometry, state: ItemRaceState): ItemRaceState {
  if (state.traps.length === 0) return state;
  let next = state;
  state.race.riders.forEach((r, i) => {
    const trap = trapUnder(geo, next.traps, r.lat.s, r.lat.d, next.race.clockS, i);
    if (!trap) return;
    // Oil is used up by the one who slides on it; tacks stay put.
    if (trap.kind === 'oil') next = { ...next, traps: next.traps.filter((t) => t !== trap) };
    next = hitRider(next, i, trap.kind, trap.owner, trap.id);
  });
  return next;
}

function flyShots(
  geo: CircuitGeometry,
  state: ItemRaceState,
  remote: readonly RemoteBody[],
  dt: number,
): ItemRaceState {
  if (state.shots.length === 0) return state;
  const step = stepShots(geo, state.shots, targetsOf(state, remote), state.race.clockS, dt);
  let next: ItemRaceState = { ...state, shots: step.shots };
  for (const { shot, key } of step.hits) {
    // A hit on another player is theirs to judge: here the shot just bursts.
    if (typeof key === 'number') next = hitRider(next, key, shot.kind, shot.owner, shot.id);
  }
  return next;
}

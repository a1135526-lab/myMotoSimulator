import type { ContactBody } from '../circuit/contacts';
import type { SimModel } from '../simulation/model';
import type { CircuitGeometry } from '../circuit/geometry';
import {
  createCircuitRace,
  type CircuitRaceState,
  type CircuitSetup,
} from '../circuit/circuitRace';
import { placeBoxes, type ItemBox } from './itemBoxes';
import {
  landHit,
  landSlow,
  NO_EFFECTS,
  shielded,
  type Landed,
  type RiderEffects,
} from './itemEffects';
import { mixSeed } from './itemRoll';
import type { ItemId } from './itemTypes';
import type { Shot, Target } from './projectiles';
import type { Owner, Smoke, Trap } from './traps';

/**
 * An item race: a circuit race plus item boxes, what each rider holds, the
 * effects on them and what's flying or lying on the track. Index 0 is the
 * player; other players in a friend room come in as `RemoteBody`s.
 */
export interface Holder {
  readonly item: ItemId | null;
  /** Uses left of it (three for the triple boost). */
  readonly charges: number;
  /** The spinner stops (and it can be used) at this race-clock time. */
  readonly readyAtS: number;
  readonly uses: number;
}

export type ItemEvent =
  | { readonly seq: number; readonly type: 'pick'; readonly rider: number; readonly item: ItemId }
  | { readonly seq: number; readonly type: 'use'; readonly rider: number; readonly item: ItemId }
  | {
      readonly seq: number;
      readonly type: 'hit';
      readonly rider: number;
      readonly item: ItemId;
      readonly by: Owner;
      readonly landed: Landed;
      /** The trap or shot that did it (gone now). */
      readonly objectId: string | null;
    }
  | { readonly seq: number; readonly type: 'dazzle'; readonly rider: number; readonly by: Owner }
  | {
      readonly seq: number;
      readonly type: 'skate';
      readonly target: Owner;
      readonly by: Owner;
      readonly landed: Landed;
    };

/** Another player's bike (their device rides it), in track coordinates. */
export interface RemoteBody extends ContactBody {
  readonly id: string;
  readonly progressM: number;
}

export interface ItemRaceState {
  readonly race: CircuitRaceState;
  readonly boxes: readonly ItemBox[];
  readonly holders: readonly Holder[];
  readonly effects: readonly RiderEffects[];
  readonly traps: readonly Trap[];
  readonly shots: readonly Shot[];
  readonly smokes: readonly Smoke[];
  readonly seed: number;
  readonly nextId: number;
  /** Recent happenings, newest last, numbered so the app can pick up new ones. */
  readonly events: readonly ItemEvent[];
  readonly eventSeq: number;
  /** Ids for what this device puts on the track (unique per player in a room). */
  readonly idPrefix: string;
}

const EMPTY_HOLDER: Holder = { item: null, charges: 0, readyAtS: 0, uses: 0 };
const EVENTS_KEPT = 40;

export function createItemRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  setup: CircuitSetup,
  seed: number,
  idPrefix = 'L',
): ItemRaceState {
  const race = createCircuitRace(geo, models, setup);
  return {
    race,
    boxes: placeBoxes(geo),
    holders: race.riders.map(() => EMPTY_HOLDER),
    effects: race.riders.map(() => NO_EFFECTS),
    traps: [],
    shots: [],
    smokes: [],
    seed: mixSeed(seed),
    nextId: 1,
    events: [],
    eventSeq: 0,
    idPrefix,
  };
}

type EventBody = ItemEvent extends infer E ? (E extends ItemEvent ? Omit<E, 'seq'> : never) : never;

export function addEvent(state: ItemRaceState, event: EventBody): ItemRaceState {
  const seq = state.eventSeq + 1;
  const events = [...state.events, { ...event, seq } as ItemEvent].slice(-EVENTS_KEPT);
  return { ...state, events, eventSeq: seq };
}

export const newId = (state: ItemRaceState): [string, ItemRaceState] => [
  `${state.idPrefix}${state.nextId}`,
  { ...state, nextId: state.nextId + 1 },
];

/** 1 = leading, among the riders here and the other players. */
export function placeOf(state: ItemRaceState, i: number, remote: readonly RemoteBody[]): number {
  const mine = state.race.riders[i]?.progressM ?? 0;
  const ahead =
    state.race.riders.filter((r, k) => k !== i && r.progressM > mine).length +
    remote.filter((r) => r.progressM > mine).length;
  return ahead + 1;
}

export const fieldSize = (state: ItemRaceState, remote: readonly RemoteBody[]) =>
  state.race.riders.length + remote.length;

/** Bikes a shot can hit: the riders here and the other players. */
export const targetsOf = (state: ItemRaceState, remote: readonly RemoteBody[]): Target[] => [
  ...state.race.riders.map((r, i) => ({ key: i as Owner, s: r.lat.s, d: r.lat.d })),
  ...remote.map((r) => ({ key: r.id as Owner, s: r.s, d: r.d })),
];

export function updateRider(
  state: ItemRaceState,
  i: number,
  effects: RiderEffects | null,
  holder: Holder | null = null,
): ItemRaceState {
  return {
    ...state,
    effects: effects ? state.effects.map((e, k) => (k === i ? effects : e)) : state.effects,
    holders: holder ? state.holders.map((h, k) => (k === i ? holder : h)) : state.holders,
  };
}

/** A hit on local rider i: the shield or the hit, and the event. */
export function hitRider(
  state: ItemRaceState,
  i: number,
  item: ItemId,
  by: Owner,
  objectId: string | null,
): ItemRaceState {
  const e = state.effects[i];
  const rider = state.race.riders[i];
  if (!e || !rider) return state;
  const clock = state.race.clockS;
  const slow = item === 'tacks' && !shielded(e, clock);
  const out = slow
    ? { effects: landSlow(e, clock, rider.sim.speedMps), landed: 'hit' as const }
    : landHit(e, clock, rider.sim.speedMps);
  if (out.landed === 'missed') return state;
  return addEvent(updateRider(state, i, out.effects), {
    type: 'hit',
    rider: i,
    item,
    by,
    landed: out.landed,
    objectId,
  });
}

/** Take a trap or shot off the track (another player ran into it). */
export function removeObject(state: ItemRaceState, id: string): ItemRaceState {
  const traps = state.traps.filter((t) => t.id !== id);
  const shots = state.shots.filter((s) => s.id !== id);
  return traps.length === state.traps.length && shots.length === state.shots.length
    ? state
    : { ...state, traps, shots };
}

import {
  boosting,
  boxReady,
  hitActive,
  ITEM_TUNING,
  inSmoke,
  shielded,
  skating,
  toWorld,
  wobble,
  type CircuitGeometry,
  type ItemId,
  type ItemRaceState,
  type TrapKind,
} from '@/domain';
import type { CircuitView } from './circuit';

interface Spot {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
}

/** What an item race adds to the frame: your item, what's on you, what's on the track. */
export interface ItemView {
  readonly held: ItemId | null;
  /** The spinner is still going. */
  readonly rolling: boolean;
  readonly charges: number;
  readonly shieldLeftS: number | null;
  readonly skateLeftS: number | null;
  readonly boosting: boolean;
  readonly hit: boolean;
  /** A paper plane is after you. */
  readonly chased: boolean;
  /** You're in someone's smoke. */
  readonly smoked: boolean;
  readonly boxes: readonly (Spot & { readonly ready: boolean })[];
  readonly traps: readonly (Spot & { readonly id: string; readonly kind: TrapKind })[];
  readonly shots: readonly (Spot & {
    readonly id: string;
    readonly kind: 'water-balloon' | 'homing';
  })[];
  /** A few puffs along each smoke screen. */
  readonly smokes: readonly Spot[];
}

const SMOKE_PUFFS = 6;
const left = (until: number, clock: number) => (clock < until ? until - clock : null);

export function toItemView(items: ItemRaceState, geo: CircuitGeometry): ItemView {
  const clock = items.race.clockS;
  const me = items.race.riders[0];
  const holder = items.holders[0];
  const fx = items.effects[0];
  const at = (s: number, d: number) => toWorld(geo, s, d);
  return {
    held: holder?.item ?? null,
    // The spinner runs for a fresh pick (all charges left), not between a triple boost's uses.
    rolling:
      !!holder?.item &&
      clock < holder.readyAtS &&
      holder.charges === (holder.item === 'triple-boost' ? ITEM_TUNING.tripleCharges : 1),
    charges: holder?.charges ?? 0,
    shieldLeftS: fx ? left(fx.shieldUntilS, clock) : null,
    skateLeftS: fx ? left(fx.skateUntilS, clock) : null,
    boosting: fx ? boosting(fx, clock) : false,
    hit: fx ? hitActive(fx, clock) : false,
    chased: items.shots.some((s) => s.target === 0),
    smoked: me ? inSmoke(geo, items.smokes, me.lat.s, 0) : false,
    boxes: items.boxes.map((b) => ({ ...at(b.s, b.d), ready: boxReady(b, clock) })),
    traps: items.traps.map((t) => ({ ...at(t.s, t.d), id: t.id, kind: t.kind })),
    shots: items.shots.map((s) => ({ ...at(s.s, s.d), id: s.id, kind: s.kind })),
    smokes: items.smokes.flatMap((m) =>
      Array.from({ length: SMOKE_PUFFS }, (_, k) =>
        at(m.s - (ITEM_TUNING.smokeLengthM * (k + 0.5)) / SMOKE_PUFFS, ((k % 3) - 1) * 2),
      ),
    ),
  };
}

/** The item race on the frame: your item, and each bike's wobble, skateboard, shield and boost. */
export function withItems(
  view: CircuitView,
  items: ItemRaceState | null,
  geo: CircuitGeometry,
): CircuitView {
  if (!items) return view;
  const clock = items.race.clockS;
  return {
    ...view,
    items: toItemView(items, geo),
    riders: view.riders.map((r, i) => {
      const fx = items.effects[i];
      if (!fx) return r;
      return {
        ...r,
        lean: r.lean + wobble(fx, clock),
        skate: skating(fx, clock),
        shield: shielded(fx, clock),
        boost: boosting(fx, clock),
      };
    }),
  };
}

import type { ItemId } from './itemTypes';

/**
 * Which item a box gives: weighted by place, so the riders at the back get
 * the strong stuff and the leader the defensive stuff. The leader never gets
 * the skateboard (it targets the leader).
 */
type Weights = Readonly<Record<ItemId, number>>;

const FRONT: Weights = {
  nitro: 6,
  'triple-boost': 4,
  oil: 14,
  tacks: 10,
  cone: 10,
  'water-balloon': 14,
  homing: 6,
  shield: 16,
  smoke: 10,
  flash: 10,
  skateboard: 0,
};
const MIDDLE: Weights = {
  nitro: 12,
  'triple-boost': 10,
  oil: 8,
  tacks: 8,
  cone: 8,
  'water-balloon': 14,
  homing: 10,
  shield: 10,
  smoke: 8,
  flash: 8,
  skateboard: 4,
};
const BACK: Weights = {
  nitro: 18,
  'triple-boost': 16,
  oil: 4,
  tacks: 4,
  cone: 4,
  'water-balloon': 10,
  homing: 14,
  shield: 6,
  smoke: 6,
  flash: 6,
  skateboard: 12,
};

/** 0 for the leader … 1 for the last rider. */
export const placeShare = (place: number, field: number): number =>
  field <= 1 ? 0 : (place - 1) / (field - 1);

export function weightsFor(share: number, leader: boolean): Weights {
  const band = share < 1 / 3 ? FRONT : share < 2 / 3 ? MIDDLE : BACK;
  return leader ? { ...band, skateboard: 0 } : band;
}

/** Seeded PRNG (mulberry32): returns a value in [0, 1) and the next seed. */
export function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** A seed from a few numbers (race, rider, box…), so the same pick repeats. */
export function mixSeed(...parts: readonly number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h ^= Math.floor(p) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function rollItem(
  seed: number,
  place: number,
  field: number,
): { item: ItemId; seed: number } {
  const weights = weightsFor(placeShare(place, field), place === 1);
  const entries = Object.entries(weights) as [ItemId, number][];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  const r = nextRandom(seed);
  let pick = r.value * total;
  for (const [item, w] of entries) {
    if (pick < w) return { item, seed: r.seed };
    pick -= w;
  }
  return { item: 'water-balloon', seed: r.seed };
}

import { gapAlong } from '../circuit/contacts';
import { sampleAt, wrapS, type CircuitGeometry } from '../circuit/geometry';
import { ITEM_TUNING as T } from './itemTypes';

/**
 * Rows of item boxes across the track. Placed by the track itself: a few rows
 * spread round the lap, kept clear of the start and of the middle of corners
 * (on a straight or a corner exit, where there's room to aim for one).
 */
export interface ItemBox {
  readonly s: number;
  readonly d: number;
  /** Race-clock time it's back after being taken (it's there when the clock has passed it). */
  readonly backAtS: number;
}

/** Keep this far clear of the start / finish line, m. */
const START_CLEAR_M = 150;
/** A row goes no closer than this radius of turn. */
const ROW_MIN_RADIUS_M = 90;
const SEARCH_STEP_M = 10;
/** One box per this much tarmac across, 3 to 5 a row. */
const BOX_PITCH_M = 3.6;

export function rowCount(lengthM: number): number {
  return Math.max(3, Math.min(5, Math.round(lengthM / 600)));
}

export function placeBoxes(geo: CircuitGeometry): ItemBox[] {
  const rows = rowCount(geo.length);
  const usable = geo.length - 2 * START_CLEAR_M;
  const across = Math.max(3, Math.min(5, Math.floor((geo.halfWidth * 2) / BOX_PITCH_M)));
  const boxes: ItemBox[] = [];
  for (let r = 0; r < rows; r++) {
    const want = START_CLEAR_M + (usable * (r + 0.5)) / rows;
    const s = straightNear(geo, want);
    const span = (across - 1) * BOX_PITCH_M;
    for (let k = 0; k < across; k++) {
      boxes.push({ s, d: -span / 2 + k * BOX_PITCH_M, backAtS: 0 });
    }
  }
  return boxes;
}

/** The nearest place to `s` gentle enough for a row (searching both ways). */
function straightNear(geo: CircuitGeometry, s: number): number {
  for (let off = 0; off < geo.length / 2; off += SEARCH_STEP_M) {
    for (const at of [s + off, s - off]) {
      const w = wrapS(geo, at);
      const clear = w > START_CLEAR_M && w < geo.length - START_CLEAR_M;
      if (clear && Math.abs(sampleAt(geo, w).curvature) < 1 / ROW_MIN_RADIUS_M) return w;
    }
  }
  return wrapS(geo, s);
}

export const boxReady = (b: ItemBox, clockS: number): boolean => clockS >= b.backAtS;

/** Index of a ready box this rider rides through, or −1. */
export function boxAt(
  geo: CircuitGeometry,
  boxes: readonly ItemBox[],
  s: number,
  d: number,
  clockS: number,
): number {
  return boxes.findIndex(
    (b) =>
      boxReady(b, clockS) &&
      Math.abs(gapAlong(geo, s, b.s)) < T.boxReachS &&
      Math.abs(b.d - d) < T.boxReachD,
  );
}

export const takeBox = (boxes: readonly ItemBox[], i: number, clockS: number): readonly ItemBox[] =>
  boxes.map((b, k) => (k === i ? { ...b, backAtS: clockS + T.boxRespawnS } : b));

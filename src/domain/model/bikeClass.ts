import type { BikeKind, BikeSegment } from './bike';

/**
 * 排氣量級距 — how riders bracket bikes by size. The upper three follow the
 * plate rule (白牌 < 250 cc ≤ 黃牌 ≤ 550 cc < 紅牌); small white-plate bikes
 * (≤ 125 cc) are their own bracket because that's where most commuters sit.
 */
export type DisplacementBand = 'upTo125' | 'to249' | 'to550' | 'over550';

export const DISPLACEMENT_BANDS: readonly DisplacementBand[] = [
  'upTo125',
  'to249',
  'to550',
  'over550',
];

export function displacementBand(displacementCc: number): DisplacementBand {
  if (displacementCc <= 125) return 'upTo125';
  if (displacementCc < 250) return 'to249';
  if (displacementCc <= 550) return 'to550';
  return 'over550';
}

export const SEGMENTS_BY_KIND: Readonly<Record<BikeKind, readonly BikeSegment[]>> = {
  scooter: ['commuter', 'sport-scooter', 'retro-scooter', 'maxi-scooter'],
  manual: ['supersport', 'naked', 'retro'],
};

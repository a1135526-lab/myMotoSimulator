import {
  DISPLACEMENT_BANDS,
  SEGMENTS_BY_KIND,
  type BikeKind,
  type BikeSegment,
  type DisplacementBand,
} from '@/domain';
import { BAND_LABELS, KIND_LABELS, SEGMENT_LABELS } from '../hooks/useCatalog';

/** Pick bikes by body style (or a whole kind) and by displacement band. */
export type StyleFilter = 'all' | BikeKind | BikeSegment;
export type BandFilter = 'all' | DisplacementBand;

export interface FilterChip<T extends string> {
  readonly id: T;
  readonly label: string;
  /** Indented under a kind (速克達 → 通勤 / 運動 …). */
  readonly sub: boolean;
}

export const STYLE_CHIPS: readonly FilterChip<StyleFilter>[] = [
  { id: 'all', label: '全部', sub: false },
  ...(['scooter', 'manual'] as const).flatMap((kind) => [
    { id: kind, label: `全部${KIND_LABELS[kind]}`, sub: false },
    ...SEGMENTS_BY_KIND[kind].map((s) => ({ id: s, label: SEGMENT_LABELS[s], sub: true })),
  ]),
];

export const BAND_CHIPS: readonly FilterChip<BandFilter>[] = [
  { id: 'all', label: '全部排氣量', sub: false },
  ...DISPLACEMENT_BANDS.map((b) => ({ id: b, label: BAND_LABELS[b], sub: false })),
];

interface Classified {
  readonly kind: BikeKind;
  readonly segment: BikeSegment;
  readonly band: DisplacementBand;
}

export const matchesStyle = (bike: Classified, style: StyleFilter) =>
  style === 'all' || bike.kind === style || bike.segment === style;

export interface BandGroup<T> {
  readonly band: DisplacementBand;
  readonly label: string;
  readonly bikes: readonly T[];
}

/** Bikes that pass both filters, in displacement-band sections (empty ones dropped). */
export function groupBikes<T extends Classified>(
  bikes: readonly T[],
  style: StyleFilter,
  band: BandFilter,
): BandGroup<T>[] {
  return DISPLACEMENT_BANDS.filter((b) => band === 'all' || b === band)
    .map((b) => ({
      band: b,
      label: BAND_LABELS[b],
      bikes: bikes.filter((x) => x.band === b && matchesStyle(x, style)),
    }))
    .filter((g) => g.bikes.length > 0);
}

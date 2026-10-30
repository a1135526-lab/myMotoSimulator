import { useMemo } from 'react';
import {
  DISPLACEMENT_BANDS,
  displacementBand,
  type BikeKind,
  type BikeSegment,
  type BikeSpec,
  type DisplacementBand,
  type LicenseClass,
} from '@/domain';
import {
  BIKE_KINDS,
  BIKES,
  partsFor,
  ROLLER_MASS_MAX_G,
  ROLLER_MASS_MIN_G,
  ROLLER_MASS_STEP_G,
  STOCK_PART_ID,
} from '@/data';
import { categoriesFor, type SelectableCategory } from '../tuning/selection';
import { useCurrentBike } from './useSimConfig';

export const CATEGORY_LABELS: Readonly<Record<SelectableCategory, string>> = {
  variator: '普利盤',
  torqueSpring: '大彈簧',
  clutchSpring: '離合器彈簧',
  clutchBell: '碗公',
  ecu: 'ECU',
  finalDrive: '齒輪比',
  intakeExhaust: '進排氣',
};

/** Same part type, named the way riders of each kind say it. */
const KIND_CATEGORY_LABELS: Readonly<
  Record<BikeKind, Partial<Record<SelectableCategory, string>>>
> = {
  scooter: {},
  manual: { finalDrive: '齒盤比（大小齒）' },
};

export const KIND_LABELS: Readonly<Record<BikeKind, string>> = {
  scooter: '速克達',
  manual: '打檔車',
};

export const LICENSE_LABELS: Readonly<Record<LicenseClass, string>> = {
  white: '白牌',
  yellow: '黃牌',
  red: '紅牌',
};

export const SEGMENT_LABELS: Readonly<Record<BikeSegment, string>> = {
  commuter: '通勤速克達',
  'sport-scooter': '運動速克達',
  'retro-scooter': '復古速克達',
  'maxi-scooter': '大型速克達',
  supersport: '仿賽跑車',
  naked: '街車',
  retro: '復古檔車',
};

export const BAND_LABELS: Readonly<Record<DisplacementBand, string>> = {
  upTo125: '125 cc 以下',
  to249: '126–249 cc・白牌',
  to550: '250–550 cc・黃牌',
  over550: '551 cc 以上・紅牌',
};

export interface PartOption {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export const ROLLER_LIMITS = {
  min: ROLLER_MASS_MIN_G,
  max: ROLLER_MASS_MAX_G,
  step: ROLLER_MASS_STEP_G,
} as const;

export interface BikeOption {
  readonly id: string;
  readonly label: string;
}

export interface BikeGroup {
  readonly band: DisplacementBand;
  readonly label: string;
  readonly bikes: readonly BikeOption[];
}

export interface KindCatalog {
  readonly kind: BikeKind;
  readonly label: string;
  readonly firstBikeId: string;
  readonly groups: readonly BikeGroup[];
}

const optionOf = (b: BikeSpec): BikeOption => ({
  id: b.id,
  label: `${b.brand} ${b.model}・${b.engine.displacementCc} cc ${SEGMENT_LABELS[b.segment]}`,
});

/** Smallest engine first, then the more powerful of the same size. */
export const bySize = (a: BikeSpec, b: BikeSpec) =>
  a.engine.displacementCc - b.engine.displacementCc ||
  a.engine.peakPower.ps - b.engine.peakPower.ps;

/** Bikes split by 速克達 / 打檔車, then grouped by displacement band. */
export function useBikeCatalog(): KindCatalog[] {
  return useMemo(
    () =>
      BIKE_KINDS.map((kind) => {
        const ofKind = BIKES.filter((b) => b.kind === kind);
        const groups = DISPLACEMENT_BANDS.map((band) => ({
          band,
          label: BAND_LABELS[band],
          bikes: ofKind
            .filter((b) => displacementBand(b.engine.displacementCc) === band)
            .sort(bySize)
            .map(optionOf),
        })).filter((g) => g.bikes.length > 0);
        return { kind, label: KIND_LABELS[kind], firstBikeId: ofKind[0]?.id ?? '', groups };
      }).filter((k) => k.firstBikeId !== ''),
    [],
  );
}

export interface CategoryOptions {
  readonly category: SelectableCategory;
  readonly label: string;
  readonly options: readonly PartOption[];
}

/** Categories that apply to the current bike, "原廠" first, then compatible catalog parts. */
export function usePartCategories(): CategoryOptions[] {
  const bike = useCurrentBike();
  return useMemo(
    () =>
      categoriesFor(bike).map((category) => ({
        category,
        label: KIND_CATEGORY_LABELS[bike.kind][category] ?? CATEGORY_LABELS[category],
        options: [
          { id: STOCK_PART_ID, name: '原廠' },
          ...partsFor(category, bike).map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
          })),
        ],
      })),
    [bike],
  );
}

import type { Provenance } from '@/domain';

export const estimated = (note: string): Provenance => ({
  verified: false,
  kind: 'estimated',
  sources: [],
  note,
});

/** Published numbers we have a citation for but haven't verified against a factory manual. */
export const cited = (
  kind: 'official' | 'community',
  sources: readonly string[],
  note: string,
): Provenance => ({ verified: false, kind, sources, note });

export const CURVE_NOTE = '峰值為公開規格；扭力曲線形狀依峰值推估，斷油轉速、轉動慣量為估計';

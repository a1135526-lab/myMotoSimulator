import type { Provenance } from '@/domain';

/** Generic aftermarket part types: effects are typical ranges, not a specific product's dyno sheet. */
export const GENERIC_ESTIMATE: Provenance = {
  verified: false,
  kind: 'estimated',
  sources: [],
  note: '通用改裝件類型，效果為一般經驗值，非特定品牌實測',
};

import { GENERIC_ESTIMATE } from './common';

export const ECU_MAPS = [
  {
    id: 'ecu-stage-1',
    name: '一階程式',
    description: '噴油/點火微調，中高轉扭力 +3~6%，斷油 +300 rpm',
    torqueGain: [
      { rpm: 3000, gain: 1.02 },
      { rpm: 6000, gain: 1.04 },
      { rpm: 8000, gain: 1.06 },
    ],
    revLimitOffsetRpm: 300,
  },
  {
    id: 'ecu-stage-2',
    name: '二階程式',
    description: '搭配進排氣，中高轉扭力 +5~10%，斷油 +700 rpm',
    torqueGain: [
      { rpm: 3000, gain: 1.03 },
      { rpm: 6000, gain: 1.07 },
      { rpm: 8500, gain: 1.1 },
    ],
    revLimitOffsetRpm: 700,
  },
].map((p) => ({
  ...p,
  category: 'ecu' as const,
  compatibleBikeIds: 'all' as const,
  provenance: GENERIC_ESTIMATE,
}));

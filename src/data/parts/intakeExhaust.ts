import { GENERIC_ESTIMATE } from './common';

export const INTAKE_EXHAUST = [
  {
    id: 'intake-high-flow-filter',
    name: '高流量空濾',
    description: '高轉進氣效率提升，約 +2%',
    torqueGain: [
      { rpm: 5000, gain: 1 },
      { rpm: 8000, gain: 1.02 },
    ],
  },
  {
    id: 'exhaust-performance',
    name: '改裝排氣管',
    description: '低轉略降 2%，高轉 +6%',
    torqueGain: [
      { rpm: 3000, gain: 0.98 },
      { rpm: 6000, gain: 1.02 },
      { rpm: 8500, gain: 1.06 },
    ],
  },
  {
    id: 'intake-exhaust-combo',
    name: '空濾 + 排氣管',
    description: '低轉略降 1%，高轉 +8%',
    torqueGain: [
      { rpm: 3000, gain: 0.99 },
      { rpm: 6000, gain: 1.03 },
      { rpm: 8500, gain: 1.08 },
    ],
  },
].map((p) => ({
  ...p,
  category: 'intakeExhaust' as const,
  compatibleBikeIds: 'all' as const,
  provenance: GENERIC_ESTIMATE,
}));

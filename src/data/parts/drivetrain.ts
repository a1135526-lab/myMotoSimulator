import { GENERIC_ESTIMATE } from './common';

export const VARIATORS = [
  {
    id: 'variator-top-speed',
    name: '極速型普利盤',
    description: '高速比延伸約 8%，極速提升、中段稍弱',
    lowRatioFactor: 1,
    highRatioFactor: 0.92,
  },
  {
    id: 'variator-launch',
    name: '起步型普利盤',
    description: '低速比加大約 6%，起步更猛',
    lowRatioFactor: 1.06,
    highRatioFactor: 1,
  },
  {
    id: 'variator-full-range',
    name: '全段型普利盤',
    description: '低速比 +4%、高速比延伸 5%',
    lowRatioFactor: 1.04,
    highRatioFactor: 0.95,
  },
].map((p) => ({
  ...p,
  category: 'variator' as const,
  compatibleBikeIds: 'all' as const,
  provenance: GENERIC_ESTIMATE,
}));

export const FINAL_DRIVES = [
  { id: 'final-drive-short-6', name: '加速齒比（+6%）', ratioFactor: 1.06 },
  { id: 'final-drive-tall-5', name: '極速齒比（−5%）', ratioFactor: 0.95 },
].map((p) => ({
  ...p,
  category: 'finalDrive' as const,
  description: '齒比越大加速越好、極速越低',
  compatibleBikeIds: 'all' as const,
  provenance: GENERIC_ESTIMATE,
}));

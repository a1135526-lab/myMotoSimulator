import { GENERIC_ESTIMATE } from './common';

export const CLUTCH_BELLS = [
  { id: 'clutch-bell-light', name: '輕量化碗公（−30%）', diameterOffsetMm: 0, massFactor: 0.7 },
  { id: 'clutch-bell-heavy', name: '加重碗公（+30%）', diameterOffsetMm: 0, massFactor: 1.3 },
].map((p) => ({
  ...p,
  category: 'clutchBell' as const,
  description: '碗公越輕，轉動慣量越小，加速反應越快',
  compatibleBikeIds: 'all' as const,
  provenance: GENERIC_ESTIMATE,
}));

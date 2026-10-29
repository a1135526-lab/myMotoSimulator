import { GENERIC_ESTIMATE } from './common';

export const TORQUE_SPRINGS = [
  { id: 'torque-spring-soft-10', name: '軟 −10%', stiffnessFactor: 0.9 },
  { id: 'torque-spring-plus-10', name: '硬 +10%', stiffnessFactor: 1.1 },
  { id: 'torque-spring-plus-20', name: '硬 +20%', stiffnessFactor: 1.2 },
  { id: 'torque-spring-plus-30', name: '硬 +30%', stiffnessFactor: 1.3 },
].map((p) => ({
  ...p,
  category: 'torqueSpring' as const,
  description: '大彈簧（開閉盤彈簧）越硬，換檔轉速越高、後段越拉轉',
  compatibleBikeIds: 'all' as const,
  provenance: GENERIC_ESTIMATE,
}));

export const CLUTCH_SPRINGS = [
  { id: 'clutch-spring-minus-300', name: '軟 −300 rpm', engageRpmOffset: -300 },
  { id: 'clutch-spring-plus-300', name: '硬 +300 rpm', engageRpmOffset: 300 },
  { id: 'clutch-spring-plus-600', name: '硬 +600 rpm', engageRpmOffset: 600 },
  { id: 'clutch-spring-plus-1000', name: '硬 +1000 rpm', engageRpmOffset: 1000 },
].map((p) => ({
  ...p,
  category: 'clutchSpring' as const,
  description: '離合器彈簧越硬，接合轉速越高，起步越猛',
  compatibleBikeIds: 'all' as const,
  provenance: GENERIC_ESTIMATE,
}));

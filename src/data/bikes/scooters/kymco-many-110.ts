import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 8, rpm: 7500 };
const peakTorque = { nm: 8.3, rpm: 6000 };
const revLimitRpm = 8500;

/** KYMCO Many 110: 110 cc, 8 ps / 7500, 8.3 N·m / 6000, 100 kg. */
export const KYMCO_MANY_110: ScooterSpec = {
  id: 'kymco-many-110',
  kind: 'scooter',
  licenseClass: 'white',
  segment: 'commuter',
  brand: 'KYMCO',
  model: 'Many 110',
  cluster: { layout: 'round-lcd', lcd: 'positive', accent: '#f6d9a8' },
  modelYear: 2021,
  engine: {
    displacementCc: 110,
    cylinders: 1,
    compressionRatio: 9.5,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.65,
    }),
    idleRpm: 1700,
    revLimitRpm,
    rotatingInertiaKgM2: 0.01,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 11, diameterMm: 16, widthMm: 13 },
    variator: { lowRatio: 2.6, highRatio: 0.78 },
    stockShiftRpm: 6200,
    stockShiftEndRpm: 7700,
    clutch: { engageRpm: 2900, fullLockRpm: 4000 },
    clutchBell: { diameterMm: 107, massKg: 0.8 },
    finalDriveRatio: 9.4,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 100,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 100, aspectRatio: 90, rimDiameterInch: 10 },
    dragAreaM2: 0.5,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.2,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

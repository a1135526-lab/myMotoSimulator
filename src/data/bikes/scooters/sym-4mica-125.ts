import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 9.0, rpm: 7500 };
const peakTorque = { nm: 9.3, rpm: 6000 };
const revLimitRpm = 8800;

/** SYM 4MICA 125: 124.6 cc, 9.0 ps / 7500, 9.3 N·m / 6000, 108 kg. */
export const SYM_4MICA_125: ScooterSpec = {
  id: 'sym-4mica-125',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'SYM',
  model: '4MICA 125',
  cluster: { layout: 'round-lcd', lcd: 'negative', accent: '#e9f3ff' },
  modelYear: 2021,
  engine: {
    displacementCc: 124.6,
    cylinders: 1,
    compressionRatio: 9.6,
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
    rotatingInertiaKgM2: 0.011,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 13, diameterMm: 18, widthMm: 14 },
    variator: { lowRatio: 2.5, highRatio: 0.8 },
    stockShiftRpm: 6300,
    stockShiftEndRpm: 7800,
    clutch: { engageRpm: 3000, fullLockRpm: 4100 },
    clutchBell: { diameterMm: 125, massKg: 0.9 },
    finalDriveRatio: 9.2,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 108,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 110, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.56,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.26,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

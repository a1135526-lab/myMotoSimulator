import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 9.2, rpm: 7500 };
const peakTorque = { nm: 9.6, rpm: 6000 };
const revLimitRpm = 8800;

/** KYMCO K1 125: 124.6 cc, 9.2 ps / 7500, 9.6 N·m / 6000, 110 kg. */
export const KYMCO_K1_125: ScooterSpec = {
  id: 'kymco-k1-125',
  kind: 'scooter',
  licenseClass: 'white',
  segment: 'commuter',
  brand: 'KYMCO',
  model: 'K1 125',
  cluster: { layout: 'k1-sweep', accent: '#f2a900', speedMaxKmh: 140 },
  modelYear: 2023,
  engine: {
    displacementCc: 124.6,
    cylinders: 1,
    compressionRatio: 9.5,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.62,
    }),
    idleRpm: 1700,
    revLimitRpm,
    rotatingInertiaKgM2: 0.01,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 12, diameterMm: 16, widthMm: 13 },
    variator: { lowRatio: 2.6, highRatio: 0.78 },
    stockShiftRpm: 6200,
    stockShiftEndRpm: 7700,
    clutch: { engageRpm: 2900, fullLockRpm: 4000 },
    clutchBell: { diameterMm: 107, massKg: 0.8 },
    finalDriveRatio: 9.8,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 110,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 100, aspectRatio: 90, rimDiameterInch: 12 },
    dragAreaM2: 0.5,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.2,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

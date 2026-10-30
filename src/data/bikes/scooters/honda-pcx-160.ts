import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 16.0, rpm: 8500 };
const peakTorque = { nm: 14.7, rpm: 6500 };
const revLimitRpm = 9500;

/** Honda PCX 160: 156.9 cc, 16.0 ps / 8500, 14.7 N·m / 6500, 132 kg. */
export const HONDA_PCX_160: ScooterSpec = {
  id: 'honda-pcx-160',
  kind: 'scooter',
  licenseClass: 'white',
  segment: 'maxi-scooter',
  brand: 'Honda',
  model: 'PCX 160',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#bfe3ff' },
  modelYear: 2021,
  engine: {
    displacementCc: 156.9,
    cylinders: 1,
    compressionRatio: 12.0,
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
    rotatingInertiaKgM2: 0.013,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 17, diameterMm: 20, widthMm: 15 },
    variator: { lowRatio: 2.4, highRatio: 0.78 },
    stockShiftRpm: 7700,
    stockShiftEndRpm: 8900,
    clutch: { engageRpm: 3200, fullLockRpm: 4600 },
    clutchBell: { diameterMm: 130, massKg: 1.0 },
    finalDriveRatio: 8.9,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 132,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 14 },
    dragAreaM2: 0.55,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.36,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

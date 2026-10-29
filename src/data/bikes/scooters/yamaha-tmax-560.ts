import type { ScooterSpec } from '@/domain';
import { cited, CURVE_NOTE, estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const SOURCES = [
  'https://www.1000ps.com/en-us/model/9942/yamaha-tmax-560',
  'https://www.motorcyclespecs.co.za/model/yamaha/yamaha-tmax-560-2025.html',
];
const peakPower = { ps: 47.6, rpm: 7500 };
const peakTorque = { nm: 55.7, rpm: 5250 };
const revLimitRpm = 8750;

/** Yamaha TMAX 560: 562 cc twin, 47.6 ps / 7500, 55.7 N·m / 5250, 218 kg, 160/60-15. */
export const YAMAHA_TMAX_560: ScooterSpec = {
  id: 'yamaha-tmax-560',
  kind: 'scooter',
  licenseClass: 'red',
  brand: 'Yamaha',
  model: 'TMAX 560',
  engine: {
    displacementCc: 562,
    compressionRatio: 10.9,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.7 }),
    idleRpm: 1200,
    revLimitRpm,
    rotatingInertiaKgM2: 0.05,
    provenance: cited('community', SOURCES, CURVE_NOTE),
  },
  cvt: {
    rollers: { count: 8, massG: 20, diameterMm: 25, widthMm: 20 },
    variator: { lowRatio: 2.3, highRatio: 0.74 },
    stockShiftRpm: 6800,
    stockShiftEndRpm: 7900,
    clutch: { engageRpm: 2800, fullLockRpm: 4000 },
    clutchBell: { diameterMm: 160, massKg: 1.6 },
    finalDriveRatio: 6.2,
    provenance: estimated('原廠 CVT（皮帶 + 鍊條二次減速）規格未公開，數值為推估'),
  },
  chassis: {
    curbMassKg: 218,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 160, aspectRatio: 60, rimDiameterInch: 15 },
    dragAreaM2: 0.55,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.7,
    provenance: cited(
      'community',
      SOURCES,
      '車重（含 ABS）、輪胎為規格資料庫；風阻、滾阻、輪組慣量為估計',
    ),
  },
};

import type { ScooterSpec } from '@/domain';
import { cited, CURVE_NOTE, estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const SOURCES = [
  'https://www.mobile01.com/topicdetail.php?f=657&t=6339151',
  'https://forum.jorsindo.com/thread-2555956-1-4.html',
];
const peakPower = { ps: 17.03, rpm: 8000 };
const peakTorque = { nm: 15.49, rpm: 6500 };
const revLimitRpm = 9500;

/** Kymco KRV 180 TCS: 175.1 cc, 17.03 ps / 8000, 1.58 kgf·m / 6500, 143 kg, 130/70-13. */
export const KYMCO_KRV_180: ScooterSpec = {
  id: 'kymco-krv-180',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'Kymco',
  model: 'KRV 180 TCS',
  engine: {
    displacementCc: 175.1,
    cylinders: 1,
    compressionRatio: 11.3,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1700,
    revLimitRpm,
    rotatingInertiaKgM2: 0.015,
    provenance: cited('community', SOURCES, CURVE_NOTE),
  },
  cvt: {
    rollers: { count: 6, massG: 14, diameterMm: 20, widthMm: 15 },
    variator: { lowRatio: 2.5, highRatio: 0.82 },
    stockShiftRpm: 7500,
    stockShiftEndRpm: 8700,
    clutch: { engageRpm: 3200, fullLockRpm: 4500 },
    clutchBell: { diameterMm: 135, massKg: 1.1 },
    finalDriveRatio: 9.2,
    provenance: estimated('原廠 CVT 規格未公開，依同級 180cc 速克達推估'),
  },
  chassis: {
    curbMassKg: 143,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 13 },
    dragAreaM2: 0.56,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.34,
    provenance: cited(
      'community',
      SOURCES,
      'TCS 版裝備重、輪胎為試駕報導；風阻、滾阻、輪組慣量為估計',
    ),
  },
};

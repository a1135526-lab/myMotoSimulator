import type { ManualSpec } from '@/domain';
import { cited, CURVE_NOTE } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const OFFICIAL = 'https://www.kawasaki.co.th/en/motorcycle/z900-2023';
const peakPower = { ps: 125, rpm: 9500 };
const peakTorque = { nm: 98.6, rpm: 7700 };
const revLimitRpm = 11000;

/** Kawasaki Z900 (2020–23): 948 cc inline four, 125 ps / 9500, 98.6 N·m / 7700, 212 kg. */
export const KAWASAKI_Z900: ManualSpec = {
  id: 'kawasaki-z900',
  kind: 'manual',
  licenseClass: 'red',
  brand: 'Kawasaki',
  model: 'Z900',
  modelYear: 2023,
  engine: {
    displacementCc: 948,
    compressionRatio: 11.8,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.7 }),
    idleRpm: 1100,
    revLimitRpm,
    rotatingInertiaKgM2: 0.05,
    provenance: cited('official', [OFFICIAL], CURVE_NOTE),
  },
  gearbox: {
    primaryRatio: 1.627,
    gearRatios: [2.692, 2.059, 1.65, 1.409, 1.222, 1.034],
    finalDriveRatio: 44 / 15,
    launchRpm: 5000,
    provenance: cited(
      'official',
      [OFFICIAL],
      '一次減速 83/51、各檔與最終 44/15 為原廠規格（2020–23 年式）',
    ),
  },
  chassis: {
    curbMassKg: 212,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.48,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: cited('official', [OFFICIAL], '整備重量為原廠數據；風阻、滾阻、輪組慣量為估計'),
  },
};

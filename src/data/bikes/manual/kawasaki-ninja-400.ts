import type { ManualSpec } from '@/domain';
import { cited, CURVE_NOTE } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const SPECS = 'https://www.motorcyclespecs.co.za/model/kawasaki/kawasaki_ninja_400_23.html';
const peakPower = { ps: 45, rpm: 10000 };
const peakTorque = { nm: 37, rpm: 8000 };
const revLimitRpm = 12500;

/** Kawasaki Ninja 400: 399 cc parallel twin, 45 ps / 10000, 37 N·m / 8000, 168 kg. */
export const KAWASAKI_NINJA_400: ManualSpec = {
  id: 'kawasaki-ninja-400',
  kind: 'manual',
  licenseClass: 'yellow',
  brand: 'Kawasaki',
  model: 'Ninja 400',
  cluster: { layout: 'analog-lcd', lcd: 'positive', accent: '#a6e36b' },
  engine: {
    displacementCc: 399,
    cylinders: 2,
    compressionRatio: 11.5,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.022,
    provenance: cited('community', [SPECS], CURVE_NOTE),
  },
  gearbox: {
    primaryRatio: 2.219,
    gearRatios: [2.929, 2.056, 1.619, 1.333, 1.154, 1.037],
    finalDriveRatio: 41 / 14,
    launchRpm: 6500,
    provenance: cited('community', [SPECS], '一次減速 71/32、各檔與最終 41/14 為規格資料庫數據'),
  },
  chassis: {
    curbMassKg: 168,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 150, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.34,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.7,
    provenance: cited('community', [SPECS], '整備重量為規格資料庫數據；風阻、滾阻、輪組慣量為估計'),
  },
};

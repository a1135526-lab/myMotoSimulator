import type { ManualSpec } from '@/domain';
import { cited, CURVE_NOTE } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const SPECS = 'https://motoroctane.com/reviews/16701-yamaha-yzf-r3-first-riding-impressions';
const WEIGHT = 'https://www.bikewale.com/yamaha-bikes/yzf-r3/specifications-features/';
const peakPower = { ps: 42, rpm: 10750 };
const peakTorque = { nm: 29.6, rpm: 9000 };
const revLimitRpm = 12500;

/** Yamaha YZF-R3: 321 cc parallel twin, 42 ps / 10750, 29.6 N·m / 9000, 169 kg. */
export const YAMAHA_YZF_R3: ManualSpec = {
  id: 'yamaha-yzf-r3',
  kind: 'manual',
  licenseClass: 'yellow',
  segment: 'supersport',
  brand: 'Yamaha',
  model: 'YZF-R3',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#3aa0ff' },
  engine: {
    displacementCc: 321,
    cylinders: 2,
    compressionRatio: 11.2,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.55,
    }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.02,
    provenance: cited('community', [SPECS], CURVE_NOTE),
  },
  gearbox: {
    primaryRatio: 3.043,
    gearRatios: [2.5, 1.824, 1.348, 1.087, 0.92, 0.8],
    finalDriveRatio: 43 / 14,
    launchRpm: 7000,
    provenance: cited(
      'community',
      [SPECS],
      '一次減速 70/23、各檔與最終 43/14 為早期規格表數據，新款未查證',
    ),
  },
  chassis: {
    curbMassKg: 169,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 17 },
    dragAreaM2: 0.34,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.68,
    provenance: cited('community', [WEIGHT], '整備重量為規格網站數據；風阻、滾阻、輪組慣量為估計'),
  },
};

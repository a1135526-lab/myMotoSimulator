import type { ManualSpec } from '@/domain';
import { cited, CURVE_NOTE } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const REVIEW = 'https://www.bennetts.co.uk/bikesocial/reviews/bikes/yamaha/mt09-2024-review';
const GEARING = [
  'https://yamahamotorsports.com/models/23-mt-09/features',
  'https://japan.webike.net/YAMAHA/MT-09+FZ-09/6557/m-spec/y2016/',
];
const peakPower = { ps: 119, rpm: 10000 };
const peakTorque = { nm: 93, rpm: 7000 };
const revLimitRpm = 11000;

/** Yamaha MT-09 (2024): 890 cc CP3 triple, 119 ps / 10000, 93 N·m / 7000, 193 kg. */
export const YAMAHA_MT_09: ManualSpec = {
  id: 'yamaha-mt-09',
  kind: 'manual',
  licenseClass: 'red',
  brand: 'Yamaha',
  model: 'MT-09',
  modelYear: 2024,
  engine: {
    displacementCc: 890,
    compressionRatio: 11.5,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.7 }),
    idleRpm: 1200,
    revLimitRpm,
    rotatingInertiaKgM2: 0.045,
    provenance: cited('official', [REVIEW], CURVE_NOTE),
  },
  gearbox: {
    primaryRatio: 1.68,
    gearRatios: [2.571, 1.947, 1.619, 1.381, 1.19, 1.037],
    finalDriveRatio: 2.812,
    launchRpm: 5000,
    provenance: cited(
      'community',
      GEARING,
      '2023+ 一、二檔為原廠新聞稿數值；三至六檔、一次減速 1.680、最終 2.812 沿用前代規格',
    ),
  },
  chassis: {
    curbMassKg: 193,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.48,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: cited(
      'official',
      [REVIEW],
      '整備重量為原廠數據；街車坐姿風阻、滾阻、輪組慣量為估計',
    ),
  },
};

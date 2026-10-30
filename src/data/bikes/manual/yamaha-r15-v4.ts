import type { ManualSpec } from '@/domain';
import { cited, CURVE_NOTE } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const OFFICIAL = 'https://www.yamaha-motor-india.com/yamaha-r15v4.html';
const GEARING = 'https://www.rgbbikes.com/yamaha-r15-v3/';
const peakPower = { ps: 18.4, rpm: 10000 };
const peakTorque = { nm: 14.2, rpm: 7500 };
const revLimitRpm = 11500;

/** Yamaha YZF-R15 V4: 155 cc VVA single, 18.4 ps / 10000, 14.2 N·m / 7500, 142 kg. */
export const YAMAHA_R15_V4: ManualSpec = {
  id: 'yamaha-r15-v4',
  kind: 'manual',
  licenseClass: 'white',
  segment: 'supersport',
  brand: 'Yamaha',
  model: 'YZF-R15 V4',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#3aa0ff' },
  engine: {
    displacementCc: 155,
    cylinders: 1,
    compressionRatio: 11.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.55,
    }),
    idleRpm: 1400,
    revLimitRpm,
    rotatingInertiaKgM2: 0.009,
    provenance: cited('official', [OFFICIAL], CURVE_NOTE),
  },
  gearbox: {
    primaryRatio: 3.042,
    gearRatios: [2.833, 1.875, 1.364, 1.143, 0.957, 0.84],
    finalDriveRatio: 48 / 14,
    launchRpm: 6500,
    provenance: cited(
      'community',
      [GEARING],
      '齒比沿用 R15 V3 公開資料（同引擎平台），V4 原廠手冊未查證',
    ),
  },
  chassis: {
    curbMassKg: 142,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 17 },
    dragAreaM2: 0.32,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.55,
    provenance: cited(
      'official',
      [OFFICIAL],
      '車重為原廠印度規格；趴姿風阻面積、滾阻、輪組慣量為估計',
    ),
  },
};

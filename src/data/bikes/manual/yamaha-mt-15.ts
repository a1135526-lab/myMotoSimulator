import type { ManualSpec } from '@/domain';
import { cited, CURVE_NOTE } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const OFFICIAL = 'https://yamaha.lk/mt-15-v2/';
const GEARING = 'https://bikeadvice.in/r15-vs-mt15-differences/';
const peakPower = { ps: 18.4, rpm: 10000 };
const peakTorque = { nm: 14.1, rpm: 7500 };
const revLimitRpm = 11000;

/** Yamaha MT-15 V2: R15 engine, shorter 52/14 final drive, 18.4 ps / 10000, 139 kg. */
export const YAMAHA_MT_15: ManualSpec = {
  id: 'yamaha-mt-15',
  kind: 'manual',
  licenseClass: 'white',
  brand: 'Yamaha',
  model: 'MT-15 V2',
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
    finalDriveRatio: 52 / 14,
    launchRpm: 6000,
    provenance: cited('community', [GEARING], '變速箱同 R15，最終齒比 52/14 為公開比較資料'),
  },
  chassis: {
    curbMassKg: 139,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 17 },
    dragAreaM2: 0.42,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.55,
    provenance: cited(
      'official',
      [OFFICIAL],
      '車重為代理商規格；街車坐姿風阻、滾阻、輪組慣量為估計',
    ),
  },
};

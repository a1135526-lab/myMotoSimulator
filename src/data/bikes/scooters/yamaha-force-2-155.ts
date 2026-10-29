import type { ScooterSpec } from '@/domain';
import { cited, CURVE_NOTE, estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const SOURCES = [
  'https://www.yamaha-mlt.com.hk/product.php?id=553&lang=2',
  'https://www.moto7.net/2021/10/2022-yamaha-force2.html',
];
const peakPower = { ps: 14.7, rpm: 8000 };
const peakTorque = { nm: 13.8, rpm: 6500 };
const revLimitRpm = 9500;

/** Yamaha Force 2.0 155: 14.7 ps / 8000, 13.8 N·m / 6500, 130 kg, 130/70-13. */
export const YAMAHA_FORCE_2_155: ScooterSpec = {
  id: 'yamaha-force-2-155',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'Yamaha',
  model: 'Force 2.0 155',
  modelYear: 2022,
  engine: {
    displacementCc: 155,
    compressionRatio: 11.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1700,
    revLimitRpm,
    rotatingInertiaKgM2: 0.013,
    provenance: cited('official', SOURCES, CURVE_NOTE),
  },
  cvt: {
    rollers: { count: 6, massG: 11, diameterMm: 20, widthMm: 15 },
    variator: { lowRatio: 2.55, highRatio: 0.84 },
    stockShiftRpm: 7500,
    stockShiftEndRpm: 8700,
    clutch: { engageRpm: 3100, fullLockRpm: 4400 },
    clutchBell: { diameterMm: 130, massKg: 1.0 },
    finalDriveRatio: 9.2,
    provenance: estimated('原廠 CVT 規格未公開，依同級 155cc 速克達推估'),
  },
  chassis: {
    curbMassKg: 130,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 13 },
    dragAreaM2: 0.55,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.33,
    provenance: cited(
      'official',
      SOURCES,
      '車重、輪胎為代理商/媒體規格；風阻、滾阻、輪組慣量為估計',
    ),
  },
};

import type { ScooterSpec } from '@/domain';
import { cited, CURVE_NOTE, estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const SOURCE = 'https://cars.tvbs.com.tw/car-news/276644';
const peakPower = { ps: 12.2, rpm: 8000 };
const peakTorque = { nm: 10.98, rpm: 6000 };
const revLimitRpm = 9300;

/** Yamaha Cygnus X 125（七代勁戰）: 12.2 ps / 8000, 1.12 kgf·m / 6000, 127 kg, 130/70-12. */
export const YAMAHA_CYGNUS_X_125: ScooterSpec = {
  id: 'yamaha-cygnus-x-125',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'Yamaha',
  model: '勁戰七代 Cygnus X 125',
  modelYear: 2026,
  engine: {
    displacementCc: 125,
    cylinders: 1,
    compressionRatio: 11.2,
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
    rotatingInertiaKgM2: 0.011,
    provenance: cited('community', [SOURCE], CURVE_NOTE),
  },
  cvt: {
    rollers: { count: 6, massG: 10, diameterMm: 18, widthMm: 14 },
    variator: { lowRatio: 2.6, highRatio: 0.86 },
    stockShiftRpm: 7300,
    stockShiftEndRpm: 8500,
    clutch: { engageRpm: 3000, fullLockRpm: 4200 },
    clutchBell: { diameterMm: 125, massKg: 0.95 },
    finalDriveRatio: 9.4,
    provenance: estimated('原廠 CVT 規格未公開，依同級 125cc 速克達推估'),
  },
  chassis: {
    curbMassKg: 127,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.52,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.29,
    provenance: cited(
      'community',
      [SOURCE],
      '車重、輪胎為媒體刊載規格；風阻、滾阻、輪組慣量為估計',
    ),
  },
};

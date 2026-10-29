import type { ScooterSpec } from '@/domain';
import { cited, CURVE_NOTE, estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const SOURCE = 'https://www.yamaha-motor.eu/al/en/b2b/pro-users/authorities/xmax-300/tech-specs/';
const peakPower = { ps: 28, rpm: 7250 };
const peakTorque = { nm: 29, rpm: 5750 };
const revLimitRpm = 8750;

/** Yamaha XMAX 300: 292 cc, 20.6 kW / 7250, 29 N·m / 5750, 179 kg wet, 140/70-14. */
export const YAMAHA_XMAX_300: ScooterSpec = {
  id: 'yamaha-xmax-300',
  kind: 'scooter',
  licenseClass: 'yellow',
  brand: 'Yamaha',
  model: 'XMAX 300',
  engine: {
    displacementCc: 292,
    cylinders: 1,
    compressionRatio: 10.9,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.65,
    }),
    idleRpm: 1500,
    revLimitRpm,
    rotatingInertiaKgM2: 0.025,
    provenance: cited('official', [SOURCE], CURVE_NOTE),
  },
  cvt: {
    rollers: { count: 6, massG: 17, diameterMm: 23, widthMm: 18 },
    variator: { lowRatio: 2.4, highRatio: 0.76 },
    stockShiftRpm: 6600,
    stockShiftEndRpm: 7700,
    clutch: { engageRpm: 3000, fullLockRpm: 4300 },
    clutchBell: { diameterMm: 160, massKg: 1.5 },
    finalDriveRatio: 7.6,
    provenance: estimated('原廠 CVT 規格未公開，依同級 300cc 速克達推估'),
  },
  chassis: {
    curbMassKg: 179,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 14 },
    dragAreaM2: 0.54,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.5,
    provenance: cited('official', [SOURCE], '車重、輪胎為原廠歐規規格；風阻、滾阻、輪組慣量為估計'),
  },
};

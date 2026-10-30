import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 46.0, rpm: 6750 };
const peakTorque = { nm: 49.0, rpm: 5500 };
const revLimitRpm = 8000;

/** SYM MAXSYM TL 508: 508 cc, 46.0 ps / 6750, 49.0 N·m / 5500, 218 kg. */
export const SYM_MAXSYM_TL_508: ScooterSpec = {
  id: 'sym-maxsym-tl-508',
  kind: 'scooter',
  licenseClass: 'yellow',
  brand: 'SYM',
  model: 'MAXSYM TL 508',
  cluster: { layout: 'tft', accent: '#4fc3ff' },
  modelYear: 2022,
  engine: {
    displacementCc: 508,
    cylinders: 2,
    compressionRatio: 10.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.65,
    }),
    idleRpm: 1400,
    revLimitRpm,
    rotatingInertiaKgM2: 0.03,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 23, diameterMm: 25, widthMm: 22 },
    variator: { lowRatio: 2.3, highRatio: 0.75 },
    stockShiftRpm: 6300,
    stockShiftEndRpm: 7400,
    clutch: { engageRpm: 2800, fullLockRpm: 4000 },
    clutchBell: { diameterMm: 160, massKg: 1.6 },
    finalDriveRatio: 6.8,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 218,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 160, aspectRatio: 60, rimDiameterInch: 14 },
    dragAreaM2: 0.62,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.58,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

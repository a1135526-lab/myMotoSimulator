import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 12.5, rpm: 8000 };
const peakTorque = { nm: 11.6, rpm: 6000 };
const revLimitRpm = 9000;

/** KYMCO Like 150: 150 cc, 12.5 ps / 8000, 11.6 N·m / 6000, 120 kg. */
export const KYMCO_LIKE_150: ScooterSpec = {
  id: 'kymco-like-150',
  kind: 'scooter',
  licenseClass: 'white',
  segment: 'retro-scooter',
  brand: 'KYMCO',
  model: 'Like 150',
  cluster: { layout: 'round-lcd', lcd: 'positive', accent: '#f6e7c1' },
  modelYear: 2022,
  engine: {
    displacementCc: 150,
    cylinders: 1,
    compressionRatio: 10.8,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1700,
    revLimitRpm,
    rotatingInertiaKgM2: 0.012,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 13, diameterMm: 19, widthMm: 17 },
    variator: { lowRatio: 2.4, highRatio: 0.85 },
    stockShiftRpm: 7000,
    stockShiftEndRpm: 8400,
    clutch: { engageRpm: 3000, fullLockRpm: 4300 },
    clutchBell: { diameterMm: 125, massKg: 0.9 },
    finalDriveRatio: 10.0,
    provenance: estimated('原廠 CVT 規格未公開，依同級復古速克達推估'),
  },
  chassis: {
    curbMassKg: 120,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 120, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.56,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.28,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

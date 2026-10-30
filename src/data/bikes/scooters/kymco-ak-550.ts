import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 53.5, rpm: 7500 };
const peakTorque = { nm: 55.6, rpm: 5750 };
const revLimitRpm = 8500;

/** KYMCO AK 550: 550.4 cc, 53.5 ps / 7500, 55.6 N·m / 5750, 225 kg. */
export const KYMCO_AK_550: ScooterSpec = {
  id: 'kymco-ak-550',
  kind: 'scooter',
  licenseClass: 'red',
  segment: 'maxi-scooter',
  brand: 'KYMCO',
  model: 'AK 550',
  cluster: { layout: 'tft', accent: '#ff9a1f' },
  modelYear: 2022,
  engine: {
    displacementCc: 550.4,
    cylinders: 2,
    compressionRatio: 11.0,
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
    rollers: { count: 6, massG: 24, diameterMm: 25, widthMm: 22 },
    variator: { lowRatio: 2.3, highRatio: 0.75 },
    stockShiftRpm: 6800,
    stockShiftEndRpm: 7900,
    clutch: { engageRpm: 2800, fullLockRpm: 4000 },
    clutchBell: { diameterMm: 160, massKg: 1.6 },
    finalDriveRatio: 6.6,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 225,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 160, aspectRatio: 60, rimDiameterInch: 15 },
    dragAreaM2: 0.62,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.6,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

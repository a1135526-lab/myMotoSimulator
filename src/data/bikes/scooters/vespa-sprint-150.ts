import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 12.9, rpm: 7750 };
const peakTorque = { nm: 12.8, rpm: 6500 };
const revLimitRpm = 9000;

/** Vespa Sprint 150: 155 cc, 12.9 ps / 7750, 12.8 N·m / 6500, 115 kg. */
export const VESPA_SPRINT_150: ScooterSpec = {
  id: 'vespa-sprint-150',
  kind: 'scooter',
  licenseClass: 'white',
  segment: 'retro-scooter',
  brand: 'Vespa',
  model: 'Sprint 150',
  cluster: { layout: 'twin-analog', accent: '#f1ece2', speedMaxKmh: 140 },
  modelYear: 2022,
  engine: {
    displacementCc: 155,
    cylinders: 1,
    compressionRatio: 11.0,
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
    rotatingInertiaKgM2: 0.013,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 12, diameterMm: 19, widthMm: 17 },
    variator: { lowRatio: 2.4, highRatio: 0.85 },
    stockShiftRpm: 6900,
    stockShiftEndRpm: 8300,
    clutch: { engageRpm: 3000, fullLockRpm: 4300 },
    clutchBell: { diameterMm: 134, massKg: 1.0 },
    finalDriveRatio: 10.2,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 115,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 120, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.56,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.28,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

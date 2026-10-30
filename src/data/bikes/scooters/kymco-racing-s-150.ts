import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 15.2, rpm: 8500 };
const peakTorque = { nm: 13.7, rpm: 6500 };
const revLimitRpm = 9800;

/** KYMCO Racing S 150: 149.6 cc, 15.2 ps / 8500, 13.7 N·m / 6500, 129 kg. */
export const KYMCO_RACING_S_150: ScooterSpec = {
  id: 'kymco-racing-s-150',
  kind: 'scooter',
  licenseClass: 'white',
  segment: 'sport-scooter',
  brand: 'KYMCO',
  model: 'Racing S 150',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#ff3d2e' },
  modelYear: 2022,
  engine: {
    displacementCc: 149.6,
    cylinders: 1,
    compressionRatio: 10.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1700,
    revLimitRpm,
    rotatingInertiaKgM2: 0.013,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 12, diameterMm: 20, widthMm: 15 },
    variator: { lowRatio: 2.6, highRatio: 0.82 },
    stockShiftRpm: 7600,
    stockShiftEndRpm: 8900,
    clutch: { engageRpm: 3200, fullLockRpm: 4500 },
    clutchBell: { diameterMm: 125, massKg: 0.95 },
    finalDriveRatio: 9.6,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 129,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.55,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.3,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

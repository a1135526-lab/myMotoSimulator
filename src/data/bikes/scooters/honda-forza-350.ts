import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 29.2, rpm: 7500 };
const peakTorque = { nm: 31.5, rpm: 5250 };
const revLimitRpm = 8500;

/** Honda Forza 350: 330 cc, 29.2 ps / 7500, 31.5 N·m / 5250, 184 kg. */
export const HONDA_FORZA_350: ScooterSpec = {
  id: 'honda-forza-350',
  kind: 'scooter',
  licenseClass: 'yellow',
  brand: 'Honda',
  model: 'Forza 350',
  cluster: { layout: 'twin-analog', accent: '#e9eef5', speedMaxKmh: 180 },
  modelYear: 2023,
  engine: {
    displacementCc: 330,
    cylinders: 1,
    compressionRatio: 10.5,
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
    rotatingInertiaKgM2: 0.02,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  cvt: {
    rollers: { count: 6, massG: 21, diameterMm: 25, widthMm: 22 },
    variator: { lowRatio: 2.6, highRatio: 0.8 },
    stockShiftRpm: 6500,
    stockShiftEndRpm: 7700,
    clutch: { engageRpm: 2900, fullLockRpm: 4100 },
    clutchBell: { diameterMm: 150, massKg: 1.3 },
    finalDriveRatio: 7.6,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 184,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 14 },
    dragAreaM2: 0.6,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.45,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

import type { ScooterSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 15.4, rpm: 8000 };
const peakTorque = { nm: 14.2, rpm: 6500 };
const revLimitRpm = 9500;

/** Yamaha AUGUR 155: 155 cc, 15.4 ps / 8000, 14.2 N·m / 6500, 132 kg. */
export const YAMAHA_AUGUR_155: ScooterSpec = {
  id: 'yamaha-augur-155',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'Yamaha',
  model: 'AUGUR 155',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#9ad1ff' },
  modelYear: 2022,
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
    rollers: { count: 6, massG: 11, diameterMm: 20, widthMm: 15 },
    variator: { lowRatio: 2.5, highRatio: 0.8 },
    stockShiftRpm: 7600,
    stockShiftEndRpm: 8800,
    clutch: { engageRpm: 3000, fullLockRpm: 4300 },
    clutchBell: { diameterMm: 130, massKg: 1.0 },
    finalDriveRatio: 9.4,
    provenance: estimated('原廠 CVT 規格未公開，依同級車推估'),
  },
  chassis: {
    curbMassKg: 132,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 13 },
    dragAreaM2: 0.54,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.33,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 210.0, rpm: 13750 };
const peakTorque = { nm: 113.0, rpm: 11000 };
const revLimitRpm = 15100;

/** BMW S 1000 RR: 999 cc, 210.0 ps / 13750, 113.0 N·m / 11000, 197 kg. */
export const BMW_S_1000_RR: ManualSpec = {
  id: 'bmw-s-1000-rr',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'supersport',
  brand: 'BMW',
  model: 'S 1000 RR',
  cluster: { layout: 'tft', accent: '#2f8fff' },
  modelYear: 2023,
  engine: {
    displacementCc: 999,
    cylinders: 4,
    compressionRatio: 13.3,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.5 }),
    idleRpm: 1200,
    revLimitRpm,
    rotatingInertiaKgM2: 0.04,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.652,
    gearRatios: [2.647, 2.091, 1.727, 1.5, 1.36, 1.261],
    finalDriveRatio: 2.647,
    launchRpm: 8000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 197,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 190, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.3,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 73.4, rpm: 8750 };
const peakTorque = { nm: 67.0, rpm: 6500 };
const revLimitRpm = 10000;

/** Yamaha YZF-R7: 689 cc, 73.4 ps / 8750, 67.0 N·m / 6500, 188 kg. */
export const YAMAHA_YZF_R7: ManualSpec = {
  id: 'yamaha-yzf-r7',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'supersport',
  brand: 'Yamaha',
  model: 'YZF-R7',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#3aa0ff' },
  modelYear: 2022,
  engine: {
    displacementCc: 689,
    cylinders: 2,
    compressionRatio: 11.5,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.7 }),
    idleRpm: 1250,
    revLimitRpm,
    rotatingInertiaKgM2: 0.035,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.925,
    gearRatios: [2.846, 2.125, 1.632, 1.3, 1.091, 0.964],
    finalDriveRatio: 2.688,
    launchRpm: 5500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 188,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.36,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.85,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

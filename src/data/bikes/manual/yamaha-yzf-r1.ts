import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 200, rpm: 13500 };
const peakTorque = { nm: 113.3, rpm: 11500 };
const revLimitRpm = 14000;

/** Yamaha YZF-R1: 998 cc, 200 ps / 13500, 113.3 N·m / 11500, 201 kg. */
export const YAMAHA_YZF_R1: ManualSpec = {
  id: 'yamaha-yzf-r1',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'supersport',
  brand: 'Yamaha',
  model: 'YZF-R1',
  cluster: { layout: 'race-strip', accent: '#2f8fff' },
  modelYear: 2020,
  engine: {
    displacementCc: 998,
    cylinders: 4,
    compressionRatio: 13.0,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.05,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.512,
    gearRatios: [2.6, 2.176, 1.842, 1.579, 1.381, 1.25],
    finalDriveRatio: 2.5625,
    launchRpm: 8000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 201,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 190, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.32,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

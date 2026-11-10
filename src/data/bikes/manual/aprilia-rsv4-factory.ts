import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 217, rpm: 13000 };
const peakTorque = { nm: 125, rpm: 10500 };
const revLimitRpm = 13600;

/** Aprilia RSV4 Factory: 1099 cc, 217 ps / 13000, 125 N·m / 10500, 202 kg. */
export const APRILIA_RSV4_FACTORY: ManualSpec = {
  id: 'aprilia-rsv4-factory',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'supersport',
  brand: 'Aprilia',
  model: 'RSV4 Factory',
  cluster: { layout: 'race-strip', accent: '#ff2d55' },
  modelYear: 2021,
  engine: {
    displacementCc: 1099,
    cylinders: 4,
    compressionRatio: 13.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.62,
    }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.05,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.659,
    gearRatios: [2.6, 2.063, 1.7, 1.476, 1.32, 1.209],
    finalDriveRatio: 2.5625,
    launchRpm: 8000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 202,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 200, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.32,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

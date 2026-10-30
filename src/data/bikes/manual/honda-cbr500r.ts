import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 47.6, rpm: 8600 };
const peakTorque = { nm: 43.0, rpm: 6500 };
const revLimitRpm = 9800;

/** Honda CBR500R: 471 cc, 47.6 ps / 8600, 43.0 N·m / 6500, 192 kg. */
export const HONDA_CBR500R: ManualSpec = {
  id: 'honda-cbr500r',
  kind: 'manual',
  licenseClass: 'yellow',
  segment: 'supersport',
  brand: 'Honda',
  model: 'CBR500R',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#ff4a3d' },
  modelYear: 2022,
  engine: {
    displacementCc: 471,
    cylinders: 2,
    compressionRatio: 10.7,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.65,
    }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.025,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 2.029,
    gearRatios: [3.285, 2.105, 1.6, 1.3, 1.15, 1.043],
    finalDriveRatio: 2.733,
    launchRpm: 6000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 192,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 160, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.36,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.75,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

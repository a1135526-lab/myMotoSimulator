import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 95.0, rpm: 12000 };
const peakTorque = { nm: 63.0, rpm: 9500 };
const revLimitRpm = 12800;

/** Honda CBR650R: 649 cc, 95.0 ps / 12000, 63.0 N·m / 9500, 208 kg. */
export const HONDA_CBR650R: ManualSpec = {
  id: 'honda-cbr650r',
  kind: 'manual',
  licenseClass: 'red',
  brand: 'Honda',
  model: 'CBR650R',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#ff4a3d' },
  modelYear: 2021,
  engine: {
    displacementCc: 649,
    cylinders: 4,
    compressionRatio: 11.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.55,
    }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.03,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.735,
    gearRatios: [3.071, 2.352, 1.888, 1.6, 1.4, 1.25],
    finalDriveRatio: 2.8,
    launchRpm: 7500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 208,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.36,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.85,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

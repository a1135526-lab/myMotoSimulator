import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 49.0, rpm: 15500 };
const peakTorque = { nm: 22.9, rpm: 13000 };
const revLimitRpm = 17500;

/** Kawasaki Ninja ZX-25R: 249.8 cc, 49.0 ps / 15500, 22.9 N·m / 13000, 183 kg. */
export const KAWASAKI_NINJA_ZX_25R: ManualSpec = {
  id: 'kawasaki-ninja-zx-25r',
  kind: 'manual',
  licenseClass: 'white',
  segment: 'supersport',
  brand: 'Kawasaki',
  model: 'Ninja ZX-25R',
  cluster: { layout: 'analog-lcd', lcd: 'negative', accent: '#a6e36b' },
  modelYear: 2023,
  engine: {
    displacementCc: 249.8,
    cylinders: 4,
    compressionRatio: 12.5,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.45,
    }),
    idleRpm: 1600,
    revLimitRpm,
    rotatingInertiaKgM2: 0.012,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 2.9,
    gearRatios: [2.928, 2.055, 1.619, 1.333, 1.153, 1.037],
    finalDriveRatio: 3.0,
    launchRpm: 10500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 183,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 150, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.36,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.6,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

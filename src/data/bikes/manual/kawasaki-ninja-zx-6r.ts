import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 130.0, rpm: 13500 };
const peakTorque = { nm: 70.8, rpm: 11000 };
const revLimitRpm = 16000;

/** Kawasaki Ninja ZX-6R: 636 cc, 130.0 ps / 13500, 70.8 N·m / 11000, 197 kg. */
export const KAWASAKI_NINJA_ZX_6R: ManualSpec = {
  id: 'kawasaki-ninja-zx-6r',
  kind: 'manual',
  licenseClass: 'red',
  brand: 'Kawasaki',
  model: 'Ninja ZX-6R',
  cluster: { layout: 'tft', accent: '#7ee03a' },
  modelYear: 2024,
  engine: {
    displacementCc: 636,
    cylinders: 4,
    compressionRatio: 12.9,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.5 }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.03,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 2.11,
    gearRatios: [2.846, 2.2, 1.85, 1.6, 1.421, 1.3],
    finalDriveRatio: 2.688,
    launchRpm: 9000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 197,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.32,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.85,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

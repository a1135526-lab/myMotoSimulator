import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 77, rpm: 14500 };
const peakTorque = { nm: 39, rpm: 13000 };
const revLimitRpm = 16000;

/** Kawasaki Ninja ZX-4RR: 399 cc, 77 ps / 14500, 39 N·m / 13000, 189 kg. */
export const KAWASAKI_NINJA_ZX_4RR: ManualSpec = {
  id: 'kawasaki-ninja-zx-4rr',
  kind: 'manual',
  licenseClass: 'yellow',
  segment: 'supersport',
  brand: 'Kawasaki',
  model: 'Ninja ZX-4RR',
  cluster: { layout: 'tft', accent: '#7ee03a' },
  modelYear: 2023,
  engine: {
    displacementCc: 399,
    cylinders: 4,
    compressionRatio: 12.3,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.5 }),
    idleRpm: 1500,
    revLimitRpm,
    rotatingInertiaKgM2: 0.025,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 2.029,
    gearRatios: [2.929, 2.056, 1.619, 1.333, 1.154, 1.037],
    finalDriveRatio: 3.0,
    launchRpm: 9000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 189,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 160, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.34,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.7,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

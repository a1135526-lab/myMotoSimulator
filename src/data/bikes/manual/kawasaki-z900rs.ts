import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 111, rpm: 8500 };
const peakTorque = { nm: 98.5, rpm: 6500 };
const revLimitRpm = 11000;

/** Kawasaki Z900RS: 948 cc, 111 ps / 8500, 98.5 N·m / 6500, 215 kg. */
export const KAWASAKI_Z900RS: ManualSpec = {
  id: 'kawasaki-z900rs',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'retro',
  brand: 'Kawasaki',
  model: 'Z900RS',
  cluster: { layout: 'retro-chrono', accent: '#ffb347' },
  modelYear: 2018,
  engine: {
    displacementCc: 948,
    cylinders: 4,
    compressionRatio: 10.8,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.72,
    }),
    idleRpm: 1100,
    revLimitRpm,
    rotatingInertiaKgM2: 0.045,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.627,
    gearRatios: [2.692, 2.059, 1.65, 1.409, 1.222, 1.034],
    finalDriveRatio: 2.8,
    launchRpm: 5000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 215,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.4,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.85,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

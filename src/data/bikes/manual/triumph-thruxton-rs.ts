import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 105, rpm: 7500 };
const peakTorque = { nm: 112, rpm: 4250 };
const revLimitRpm = 8000;

/** Triumph Thruxton RS: 1200 cc, 105 ps / 7500, 112 N·m / 4250, 216 kg. */
export const TRIUMPH_THRUXTON_RS: ManualSpec = {
  id: 'triumph-thruxton-rs',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'retro',
  brand: 'Triumph',
  model: 'Thruxton RS',
  cluster: { layout: 'retro-chrono', accent: '#ffb347', speedMaxKmh: 260 },
  modelYear: 2020,
  engine: {
    displacementCc: 1200,
    cylinders: 2,
    compressionRatio: 12.1,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.8 }),
    idleRpm: 1000,
    revLimitRpm,
    rotatingInertiaKgM2: 0.05,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.95,
    gearRatios: [2.571, 1.947, 1.619, 1.381, 1.19, 1.037],
    finalDriveRatio: 2.294,
    launchRpm: 4500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 216,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 160, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.38,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.85,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

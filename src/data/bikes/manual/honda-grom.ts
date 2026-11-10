import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 10, rpm: 7250 };
const peakTorque = { nm: 11, rpm: 5500 };
const revLimitRpm = 8500;

/** Honda Grom (MSX125): 124 cc, 10 ps / 7250, 11 N·m / 5500, 103 kg. */
export const HONDA_GROM: ManualSpec = {
  id: 'honda-grom',
  kind: 'manual',
  licenseClass: 'white',
  segment: 'naked',
  brand: 'Honda',
  model: 'Grom (MSX125)',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#ff5a3c' },
  modelYear: 2021,
  engine: {
    displacementCc: 124,
    cylinders: 1,
    compressionRatio: 10.0,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.7 }),
    idleRpm: 1400,
    revLimitRpm,
    rotatingInertiaKgM2: 0.012,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 3.35,
    gearRatios: [2.5, 1.55, 1.15, 0.923, 0.785],
    finalDriveRatio: 2.267,
    launchRpm: 5000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 103,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.42,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.3,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

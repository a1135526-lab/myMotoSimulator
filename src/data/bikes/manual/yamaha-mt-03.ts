import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 42.0, rpm: 10750 };
const peakTorque = { nm: 29.6, rpm: 9000 };
const revLimitRpm = 12500;

/** Yamaha MT-03: 321 cc, 42.0 ps / 10750, 29.6 N·m / 9000, 168 kg. */
export const YAMAHA_MT_03: ManualSpec = {
  id: 'yamaha-mt-03',
  kind: 'manual',
  licenseClass: 'yellow',
  brand: 'Yamaha',
  model: 'MT-03',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#7fd6ff' },
  modelYear: 2022,
  engine: {
    displacementCc: 321,
    cylinders: 2,
    compressionRatio: 11.2,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.02,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 3.043,
    gearRatios: [2.5, 1.823, 1.4, 1.143, 0.957, 0.84],
    finalDriveRatio: 3.071,
    launchRpm: 7000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 168,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 17 },
    dragAreaM2: 0.44,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.6,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

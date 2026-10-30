import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 130.0, rpm: 12000 };
const peakTorque = { nm: 80.0, rpm: 9500 };
const revLimitRpm = 12650;

/** Triumph Street Triple 765 RS: 765 cc, 130.0 ps / 12000, 80.0 N·m / 9500, 188 kg. */
export const TRIUMPH_STREET_TRIPLE_765_RS: ManualSpec = {
  id: 'triumph-street-triple-765-rs',
  kind: 'manual',
  licenseClass: 'red',
  brand: 'Triumph',
  model: 'Street Triple 765 RS',
  cluster: { layout: 'tft', accent: '#ffd23f' },
  modelYear: 2023,
  engine: {
    displacementCc: 765,
    cylinders: 3,
    compressionRatio: 12.9,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1250,
    revLimitRpm,
    rotatingInertiaKgM2: 0.035,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.75,
    gearRatios: [2.615, 2.0, 1.666, 1.444, 1.304, 1.208],
    finalDriveRatio: 2.812,
    launchRpm: 7500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 188,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.44,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.85,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

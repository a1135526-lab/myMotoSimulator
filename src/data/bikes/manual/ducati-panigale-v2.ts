import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 155.0, rpm: 10750 };
const peakTorque = { nm: 104.0, rpm: 9000 };
const revLimitRpm = 11500;

/** Ducati Panigale V2: 955 cc, 155.0 ps / 10750, 104.0 N·m / 9000, 200 kg. */
export const DUCATI_PANIGALE_V2: ManualSpec = {
  id: 'ducati-panigale-v2',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'supersport',
  brand: 'Ducati',
  model: 'Panigale V2',
  cluster: { layout: 'tft', accent: '#ff2d2d' },
  modelYear: 2023,
  engine: {
    displacementCc: 955,
    cylinders: 2,
    compressionRatio: 12.5,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.045,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.85,
    gearRatios: [2.466, 1.764, 1.4, 1.182, 1.042, 0.958],
    finalDriveRatio: 3.0,
    launchRpm: 7000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 200,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 180, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.31,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

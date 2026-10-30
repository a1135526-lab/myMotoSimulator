import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 44.0, rpm: 9000 };
const peakTorque = { nm: 37.0, rpm: 7000 };
const revLimitRpm = 10500;

/** KTM 390 Duke: 373.2 cc, 44.0 ps / 9000, 37.0 N·m / 7000, 163 kg. */
export const KTM_390_DUKE: ManualSpec = {
  id: 'ktm-390-duke',
  kind: 'manual',
  licenseClass: 'yellow',
  segment: 'naked',
  brand: 'KTM',
  model: '390 Duke',
  cluster: { layout: 'tft', accent: '#ff8a00' },
  modelYear: 2021,
  engine: {
    displacementCc: 373.2,
    cylinders: 1,
    compressionRatio: 12.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1500,
    revLimitRpm,
    rotatingInertiaKgM2: 0.018,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 2.667,
    gearRatios: [2.833, 1.875, 1.5, 1.25, 1.087, 0.957],
    finalDriveRatio: 3.0,
    launchRpm: 6500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 163,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 150, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.44,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.6,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

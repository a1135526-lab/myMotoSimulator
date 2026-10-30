import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 34.0, rpm: 9250 };
const peakTorque = { nm: 28.0, rpm: 7500 };
const revLimitRpm = 10500;

/** BMW G 310 R: 313 cc, 34.0 ps / 9250, 28.0 N·m / 7500, 164 kg. */
export const BMW_G_310_R: ManualSpec = {
  id: 'bmw-g-310-r',
  kind: 'manual',
  licenseClass: 'yellow',
  segment: 'naked',
  brand: 'BMW',
  model: 'G 310 R',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#e8f1ff' },
  modelYear: 2022,
  engine: {
    displacementCc: 313,
    cylinders: 1,
    compressionRatio: 10.9,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1400,
    revLimitRpm,
    rotatingInertiaKgM2: 0.018,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 3.083,
    gearRatios: [3.083, 2.062, 1.545, 1.272, 1.13, 1.0],
    finalDriveRatio: 2.8,
    launchRpm: 6500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 164,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 150, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.44,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.6,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 19.3, rpm: 10000 };
const peakTorque = { nm: 14.7, rpm: 8500 };
const revLimitRpm = 11000;

/** Yamaha XSR155: 155 cc, 19.3 ps / 10000, 14.7 N·m / 8500, 134 kg. */
export const YAMAHA_XSR155: ManualSpec = {
  id: 'yamaha-xsr155',
  kind: 'manual',
  licenseClass: 'white',
  segment: 'retro',
  brand: 'Yamaha',
  model: 'XSR155',
  cluster: { layout: 'round-lcd', lcd: 'negative', accent: '#e9f1ff' },
  modelYear: 2022,
  engine: {
    displacementCc: 155,
    cylinders: 1,
    compressionRatio: 11.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.55,
    }),
    idleRpm: 1500,
    revLimitRpm,
    rotatingInertiaKgM2: 0.012,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 3.042,
    gearRatios: [2.833, 1.875, 1.364, 1.143, 0.957, 0.84],
    finalDriveRatio: 3.357,
    launchRpm: 7500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 134,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 17 },
    dragAreaM2: 0.45,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.5,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

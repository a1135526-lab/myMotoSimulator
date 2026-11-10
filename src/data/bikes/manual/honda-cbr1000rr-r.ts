import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 218, rpm: 14500 };
const peakTorque = { nm: 113, rpm: 12500 };
const revLimitRpm = 15000;

/** Honda CBR1000RR-R Fireblade: 999 cc, 218 ps / 14500, 113 N·m / 12500, 201 kg. */
export const HONDA_CBR1000RR_R: ManualSpec = {
  id: 'honda-cbr1000rr-r',
  kind: 'manual',
  licenseClass: 'red',
  segment: 'supersport',
  brand: 'Honda',
  model: 'CBR1000RR-R Fireblade',
  cluster: { layout: 'race-strip', accent: '#ff3b30' },
  modelYear: 2020,
  engine: {
    displacementCc: 999,
    cylinders: 4,
    compressionRatio: 13.6,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({
      peakPower,
      peakTorque,
      revLimitRpm,
      lowEndFraction: 0.55,
    }),
    idleRpm: 1300,
    revLimitRpm,
    rotatingInertiaKgM2: 0.05,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.63,
    gearRatios: [2.615, 2.0, 1.667, 1.444, 1.304, 1.208],
    finalDriveRatio: 2.5,
    launchRpm: 8500,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 201,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 200, aspectRatio: 55, rimDiameterInch: 17 },
    dragAreaM2: 0.31,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

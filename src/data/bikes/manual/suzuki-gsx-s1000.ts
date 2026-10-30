import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 152.0, rpm: 11000 };
const peakTorque = { nm: 106.0, rpm: 9250 };
const revLimitRpm = 11800;

/** Suzuki GSX-S1000: 999 cc, 152.0 ps / 11000, 106.0 N·m / 9250, 214 kg. */
export const SUZUKI_GSX_S1000: ManualSpec = {
  id: 'suzuki-gsx-s1000',
  kind: 'manual',
  licenseClass: 'red',
  brand: 'Suzuki',
  model: 'GSX-S1000',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#4fc3ff' },
  modelYear: 2022,
  engine: {
    displacementCc: 999,
    cylinders: 4,
    compressionRatio: 12.2,
    peakPower,
    peakTorque,
    torqueCurve: synthesizeTorqueCurve({ peakPower, peakTorque, revLimitRpm, lowEndFraction: 0.6 }),
    idleRpm: 1150,
    revLimitRpm,
    rotatingInertiaKgM2: 0.045,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 1.553,
    gearRatios: [2.562, 2.052, 1.714, 1.5, 1.36, 1.269],
    finalDriveRatio: 2.588,
    launchRpm: 6000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 214,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 190, aspectRatio: 50, rimDiameterInch: 17 },
    dragAreaM2: 0.46,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.9,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

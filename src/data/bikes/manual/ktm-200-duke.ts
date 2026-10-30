import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 25.0, rpm: 10000 };
const peakTorque = { nm: 19.2, rpm: 8000 };
const revLimitRpm = 10800;

/** KTM 200 Duke: 199.5 cc, 25.0 ps / 10000, 19.2 N·m / 8000, 159 kg. */
export const KTM_200_DUKE: ManualSpec = {
  id: 'ktm-200-duke',
  kind: 'manual',
  licenseClass: 'white',
  brand: 'KTM',
  model: '200 Duke',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#ff8a00' },
  modelYear: 2021,
  engine: {
    displacementCc: 199.5,
    cylinders: 1,
    compressionRatio: 11.3,
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
    rotatingInertiaKgM2: 0.013,
    provenance: estimated(
      '峰值馬力／扭力、排氣量、車重為公開規格整理（未逐一查證）；扭力曲線形狀、斷油轉速、轉動慣量為估計',
    ),
  },
  gearbox: {
    primaryRatio: 3.0,
    gearRatios: [2.833, 2.0, 1.5, 1.25, 1.087, 0.957],
    finalDriveRatio: 3.071,
    launchRpm: 7000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 159,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 150, aspectRatio: 60, rimDiameterInch: 17 },
    dragAreaM2: 0.44,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.55,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

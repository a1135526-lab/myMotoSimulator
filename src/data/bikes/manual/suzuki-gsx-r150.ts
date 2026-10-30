import type { ManualSpec } from '@/domain';
import { estimated } from '../provenance';
import { synthesizeTorqueCurve } from '../synthesizeTorqueCurve';

const peakPower = { ps: 19.2, rpm: 10000 };
const peakTorque = { nm: 14.0, rpm: 9000 };
const revLimitRpm = 11500;

/** Suzuki GSX-R150: 147.3 cc, 19.2 ps / 10000, 14.0 N·m / 9000, 131 kg. */
export const SUZUKI_GSX_R150: ManualSpec = {
  id: 'suzuki-gsx-r150',
  kind: 'manual',
  licenseClass: 'white',
  brand: 'Suzuki',
  model: 'GSX-R150',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#4fd0ff' },
  modelYear: 2021,
  engine: {
    displacementCc: 147.3,
    cylinders: 1,
    compressionRatio: 11.5,
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
    primaryRatio: 3.272,
    gearRatios: [3.083, 2.062, 1.647, 1.4, 1.227, 1.095],
    finalDriveRatio: 3.071,
    launchRpm: 8000,
    provenance: estimated('齒比依公開規格資料整理，部分數值為推估'),
  },
  chassis: {
    curbMassKg: 131,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 17 },
    dragAreaM2: 0.38,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.5,
    provenance: estimated('整備重量、輪胎為公開規格；風阻、滾阻、輪組慣量為估計'),
  },
};

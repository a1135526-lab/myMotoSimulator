import type { ScooterSpec } from '@/domain';

const OFFICIAL = 'https://tw.sym-global.com/mmbcu';

/**
 * SYM MMBCU 158.
 * Official: 158 cc, 11.62 kW (15.8 ps) / 8000 rpm, 15.1 N·m / 6500 rpm,
 * curb 136 kg, rear tire 130/70-13.
 * Shares the G160 engine family with DRGBT; CVT values are inferred from it.
 */
export const SYM_MMBCU_158: ScooterSpec = {
  id: 'sym-mmbcu-158',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'SYM',
  model: 'MMBCU 158',
  modelYear: 2026,
  engine: {
    displacementCc: 158,
    compressionRatio: 11.5,
    peakPower: { ps: 15.8, rpm: 8000 },
    peakTorque: { nm: 15.1, rpm: 6500 },
    torqueCurve: [
      { rpm: 1500, torqueNm: 9.0 },
      { rpm: 2000, torqueNm: 10.0 },
      { rpm: 2500, torqueNm: 11.0 },
      { rpm: 3000, torqueNm: 11.9 },
      { rpm: 3500, torqueNm: 12.7 },
      { rpm: 4000, torqueNm: 13.3 },
      { rpm: 4500, torqueNm: 13.8 },
      { rpm: 5000, torqueNm: 14.3 },
      { rpm: 5500, torqueNm: 14.7 },
      { rpm: 6000, torqueNm: 15.0 },
      { rpm: 6500, torqueNm: 15.1 },
      { rpm: 7000, torqueNm: 14.9 },
      { rpm: 7500, torqueNm: 14.45 },
      { rpm: 8000, torqueNm: 13.87 },
      { rpm: 8500, torqueNm: 12.8 },
      { rpm: 9000, torqueNm: 11.6 },
      { rpm: 9500, torqueNm: 10.3 },
    ],
    idleRpm: 1700,
    revLimitRpm: 9500,
    rotatingInertiaKgM2: 0.015,
    provenance: {
      verified: false,
      kind: 'official',
      sources: [OFFICIAL],
      note: '峰值馬力/扭力為官網數據；曲線形狀、壓縮比、斷油轉速、轉動慣量為估計',
    },
  },
  cvt: {
    rollers: { count: 6, massG: 18, diameterMm: 20, widthMm: 15 },
    variator: { lowRatio: 2.5, highRatio: 0.866 },
    stockShiftRpm: 7400,
    stockShiftEndRpm: 8700,
    clutch: { engageRpm: 3200, fullLockRpm: 4500 },
    clutchBell: { diameterMm: 135, massKg: 1.1 },
    finalDriveRatio: 9.2,
    provenance: {
      verified: false,
      kind: 'estimated',
      sources: [],
      note: '與 DRGBT 同屬 G160 引擎族，CVT 參數比照 DRG 推估；換檔轉速爬升比照 JET SL 車主實車觀察',
    },
  },
  chassis: {
    curbMassKg: 136,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 13 },
    dragAreaM2: 0.6,
    rollingResistanceCoeff: 0.016,
    wheelInertiaKgM2: 0.34,
    provenance: {
      verified: false,
      kind: 'official',
      sources: [OFFICIAL],
      note: '車重、輪胎為官網數據（官網車重未標單位，以 kg 解讀）；跑旅車型坐姿較直立，風阻面積估計較大',
    },
  },
};

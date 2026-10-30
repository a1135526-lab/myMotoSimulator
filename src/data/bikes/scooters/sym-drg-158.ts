import type { ScooterSpec } from '@/domain';

const OFFICIAL = 'https://tw.sym-global.com/drgbt2';

/**
 * SYM DRGBT 158 (2026 年式).
 * Official: 158 cc, 11.8 kW (16 ps) / 8000 rpm, 15.1 N·m / 6500 rpm,
 * curb 137 kg, rear tire 130/70-13.
 * Stock rollers 6 × 18 g (20×15) per multiple community/parts sources.
 */
export const SYM_DRG_158: ScooterSpec = {
  id: 'sym-drg-158',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'SYM',
  model: 'DRGBT 158',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#ff4a3d' },
  modelYear: 2026,
  engine: {
    displacementCc: 158,
    cylinders: 1,
    compressionRatio: 11.5,
    peakPower: { ps: 16, rpm: 8000 },
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
      { rpm: 7000, torqueNm: 14.95 },
      { rpm: 7500, torqueNm: 14.6 },
      { rpm: 8000, torqueNm: 14.09 },
      { rpm: 8500, torqueNm: 13.0 },
      { rpm: 9000, torqueNm: 11.8 },
      { rpm: 9500, torqueNm: 10.5 },
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
    variator: { lowRatio: 2.5, highRatio: 0.84 },
    stockShiftRpm: 7500,
    stockShiftEndRpm: 8800,
    clutch: { engageRpm: 3200, fullLockRpm: 4500 },
    clutchBell: { diameterMm: 135, massKg: 1.1 },
    finalDriveRatio: 9.2,
    provenance: {
      verified: false,
      kind: 'community',
      sources: [
        'https://www.motobuy.com.tw/p_info.php?t1=281&p=5455',
        'https://forum.jorsindo.com/thread-2546672-1-2.html',
      ],
      note: '普利珠 18g / 20×15 為車友與零件商資料；換檔轉速爬升比照 JET SL 車主實車觀察推估；其餘 CVT 參數為估計',
    },
  },
  chassis: {
    curbMassKg: 137,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 130, aspectRatio: 70, rimDiameterInch: 13 },
    dragAreaM2: 0.55,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.34,
    provenance: {
      verified: false,
      kind: 'official',
      sources: [OFFICIAL],
      note: '車重、輪胎為官網數據；風阻面積、滾阻係數、輪組慣量為估計',
    },
  },
};

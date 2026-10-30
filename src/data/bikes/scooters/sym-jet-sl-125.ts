import type { ScooterSpec } from '@/domain';

const OFFICIAL = 'https://tw.sym-global.com/jetsl125';

/**
 * SYM JET SL 125 (水冷).
 * Official: 124.6 cc, 9.56 kW (13 ps) / 8000 rpm, 11.46 N·m / 6000 rpm,
 * curb 123 kg, rear tire 120/70-12.
 * Torque-curve *shape* between the official peaks, and all CVT internals,
 * are engineering estimates.
 */
export const SYM_JET_SL_125: ScooterSpec = {
  id: 'sym-jet-sl-125',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'SYM',
  model: 'JET SL 125',
  cluster: { layout: 'lcd-bar', lcd: 'negative', accent: '#dff1ff' },
  engine: {
    displacementCc: 124.6,
    cylinders: 1,
    compressionRatio: 11.5,
    peakPower: { ps: 13, rpm: 8000 },
    peakTorque: { nm: 11.46, rpm: 6000 },
    torqueCurve: [
      { rpm: 1500, torqueNm: 7.0 },
      { rpm: 2000, torqueNm: 7.8 },
      { rpm: 2500, torqueNm: 8.5 },
      { rpm: 3000, torqueNm: 9.2 },
      { rpm: 3500, torqueNm: 9.8 },
      { rpm: 4000, torqueNm: 10.3 },
      { rpm: 4500, torqueNm: 10.7 },
      { rpm: 5000, torqueNm: 11.0 },
      { rpm: 5500, torqueNm: 11.3 },
      { rpm: 6000, torqueNm: 11.46 },
      { rpm: 6500, torqueNm: 11.45 },
      { rpm: 7000, torqueNm: 11.43 },
      { rpm: 7500, torqueNm: 11.42 },
      { rpm: 8000, torqueNm: 11.41 },
      { rpm: 8500, torqueNm: 10.6 },
      { rpm: 9000, torqueNm: 9.5 },
      { rpm: 9500, torqueNm: 8.4 },
    ],
    idleRpm: 1700,
    revLimitRpm: 9500,
    rotatingInertiaKgM2: 0.012,
    provenance: {
      verified: false,
      kind: 'official',
      sources: [OFFICIAL],
      note: '峰值馬力/扭力為官網數據；曲線形狀、壓縮比、斷油轉速、轉動慣量為估計',
    },
  },
  cvt: {
    rollers: { count: 6, massG: 12, diameterMm: 18, widthMm: 14 },
    variator: { lowRatio: 2.55, highRatio: 0.87 },
    stockShiftRpm: 7400,
    stockShiftEndRpm: 8700,
    clutch: { engageRpm: 3000, fullLockRpm: 4200 },
    clutchBell: { diameterMm: 125, massKg: 0.95 },
    finalDriveRatio: 8.9,
    provenance: {
      verified: false,
      kind: 'community',
      sources: [
        '車主實車觀察（2026-10-29）：全油門約 7,400 rpm 開始換檔、之後穩定爬升，極速時 8,750–9,000 rpm',
      ],
      note: '換檔起點、換檔爬升與極速轉速依車主轉速表校準；普利珠、離合器、速比細節仍為推估',
    },
  },
  chassis: {
    curbMassKg: 123,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 120, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.52,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.28,
    provenance: {
      verified: false,
      kind: 'official',
      sources: [OFFICIAL],
      note: '車重、輪胎為官網數據；風阻面積、滾阻係數、輪組慣量為估計',
    },
  },
  referencePerformance: {
    zeroTo100mS: 8.0,
    provenance: {
      verified: false,
      kind: 'community',
      sources: ['https://cars.tvbs.com.tw/car-news/197364'],
      note: '車友自行實測 0–100 m 最快約 8 秒（TVBS 整理），非專業測試',
    },
  },
};

import type { ScooterSpec } from '@/domain';

/**
 * Synthetic bike for tests only. Numbers are round and plausible for a
 * ~150 cc scooter but do NOT describe any real model.
 */
export const TEST_BIKE: ScooterSpec = {
  id: 'test-scooter-150',
  kind: 'scooter',
  licenseClass: 'white',
  brand: 'Test',
  model: 'Scooter 150',
  engine: {
    displacementCc: 150,
    cylinders: 1,
    compressionRatio: 11,
    peakPower: { ps: 15, rpm: 8000 },
    peakTorque: { nm: 14, rpm: 6500 },
    torqueCurve: [
      { rpm: 1500, torqueNm: 7 },
      { rpm: 2000, torqueNm: 8.5 },
      { rpm: 2500, torqueNm: 9.5 },
      { rpm: 3000, torqueNm: 10.5 },
      { rpm: 3500, torqueNm: 11.3 },
      { rpm: 4000, torqueNm: 12 },
      { rpm: 4500, torqueNm: 12.6 },
      { rpm: 5000, torqueNm: 13.1 },
      { rpm: 5500, torqueNm: 13.5 },
      { rpm: 6000, torqueNm: 13.8 },
      { rpm: 6500, torqueNm: 14 },
      { rpm: 7000, torqueNm: 13.9 },
      { rpm: 7500, torqueNm: 13.6 },
      { rpm: 8000, torqueNm: 13.1 },
      { rpm: 8500, torqueNm: 12.3 },
      { rpm: 9000, torqueNm: 11.2 },
    ],
    idleRpm: 1700,
    revLimitRpm: 9000,
    rotatingInertiaKgM2: 0.012,
    provenance: { verified: false, kind: 'estimated', sources: [], note: 'test fixture' },
  },
  cvt: {
    rollers: { count: 6, massG: 13, diameterMm: 20, widthMm: 15 },
    variator: { lowRatio: 2.6, highRatio: 0.8 },
    stockShiftRpm: 7500,
    stockShiftEndRpm: 8600,
    clutch: { engageRpm: 3000, fullLockRpm: 4200 },
    clutchBell: { diameterMm: 130, massKg: 1.0 },
    finalDriveRatio: 9.5,
    provenance: { verified: false, kind: 'estimated', sources: [] },
  },
  chassis: {
    curbMassKg: 125,
    defaultRiderMassKg: 70,
    rearTire: { widthMm: 120, aspectRatio: 70, rimDiameterInch: 12 },
    dragAreaM2: 0.6,
    rollingResistanceCoeff: 0.015,
    wheelInertiaKgM2: 0.25,
    provenance: { verified: false, kind: 'estimated', sources: [] },
  },
};

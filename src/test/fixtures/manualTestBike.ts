import type { ManualSpec } from '@/domain';
import { TEST_BIKE } from './testBike';

/**
 * Synthetic 6-speed manual bike for tests only. Shares the test scooter's
 * engine but revs higher; does NOT describe any real model.
 */
export const MANUAL_TEST_BIKE: ManualSpec = {
  id: 'test-manual-150',
  kind: 'manual',
  licenseClass: 'white',
  brand: 'Test',
  model: 'Manual 150',
  engine: { ...TEST_BIKE.engine, idleRpm: 1400 },
  gearbox: {
    primaryRatio: 3.0,
    gearRatios: [2.8, 1.9, 1.4, 1.15, 0.96, 0.84],
    finalDriveRatio: 3.4,
    launchRpm: 6000,
    provenance: { verified: false, kind: 'estimated', sources: [], note: 'test fixture' },
  },
  chassis: {
    ...TEST_BIKE.chassis,
    curbMassKg: 140,
    rearTire: { widthMm: 140, aspectRatio: 70, rimDiameterInch: 17 },
    dragAreaM2: 0.4,
    wheelInertiaKgM2: 0.55,
  },
};

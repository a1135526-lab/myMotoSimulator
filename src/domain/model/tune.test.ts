import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { TEST_BIKE } from '../../test/fixtures/testBike';
import { createStockTune, STOCK_GAIN } from './tune';

describe('createStockTune', () => {
  it('scooter: fills every roller slot and copies stock CVT values', () => {
    const tune = createStockTune(TEST_BIKE);
    const cvt = tune.cvt;
    expect(cvt).not.toBeNull();
    expect(cvt?.rollerMassesG).toHaveLength(TEST_BIKE.cvt.rollers.count);
    expect(cvt?.rollerMassesG.every((m) => m === TEST_BIKE.cvt.rollers.massG)).toBe(true);
    expect(cvt?.variator).toEqual(TEST_BIKE.cvt.variator);
    expect(cvt?.torqueSpringFactor).toBe(1);
    expect(cvt?.clutchEngageRpm).toBe(TEST_BIKE.cvt.clutch.engageRpm);
    expect(cvt?.clutchBell).toEqual(TEST_BIKE.cvt.clutchBell);
    expect(tune.finalDriveRatio).toBe(TEST_BIKE.cvt.finalDriveRatio);
  });

  it('copies stock ECU and chassis values', () => {
    const tune = createStockTune(TEST_BIKE);
    expect(tune.ecu.revLimitRpm).toBe(TEST_BIKE.engine.revLimitRpm);
    expect(tune.ecu.torqueGain).toBe(STOCK_GAIN);
    expect(tune.intakeExhaustGain).toBe(STOCK_GAIN);
    expect(tune.riderMassKg).toBe(TEST_BIKE.chassis.defaultRiderMassKg);
    expect(tune.extraMassKg).toBe(0);
  });

  it('manual: no CVT tune, final drive from the sprockets', () => {
    const tune = createStockTune(MANUAL_TEST_BIKE);
    expect(tune.cvt).toBeNull();
    expect(tune.finalDriveRatio).toBe(MANUAL_TEST_BIKE.gearbox.finalDriveRatio);
  });
});

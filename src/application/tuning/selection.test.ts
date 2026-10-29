import { describe, expect, it } from 'vitest';
import { createStockTune } from '@/domain';
import { getBike } from '@/data';
import { createStockSelection, isStock, resolveTune, TuneSelectionSchema } from './selection';

const drg = getBike('sym-drg-158');
if (drg.kind !== 'scooter') throw new Error('DRG must be a scooter');
const bike = drg;
const stock = createStockSelection(bike);

describe('tune selection', () => {
  it('stock selection resolves to the stock tune', () => {
    expect(resolveTune(bike, stock)).toEqual(createStockTune(bike));
    expect(isStock(stock, 'ecu')).toBe(true);
  });

  it('applies relative parts to stock values', () => {
    const tune = resolveTune(bike, {
      ...stock,
      parts: {
        ...stock.parts,
        variator: 'variator-top-speed',
        torqueSpring: 'torque-spring-plus-10',
        clutchSpring: 'clutch-spring-plus-600',
        clutchBell: 'clutch-bell-light',
        ecu: 'ecu-stage-1',
        finalDrive: 'final-drive-short-6',
      },
    });
    expect(tune.cvt?.variator.highRatio).toBeCloseTo(bike.cvt.variator.highRatio * 0.92);
    expect(tune.cvt?.torqueSpringFactor).toBe(1.1);
    expect(tune.cvt?.clutchEngageRpm).toBe(bike.cvt.clutch.engageRpm + 600);
    expect(tune.cvt?.clutchBell.massKg).toBeCloseTo(bike.cvt.clutchBell.massKg * 0.7);
    expect(tune.ecu.revLimitRpm).toBe(bike.engine.revLimitRpm + 300);
    expect(tune.finalDriveRatio).toBeCloseTo(bike.cvt.finalDriveRatio * 1.06);
  });

  it('falls back to stock for unknown part ids and wrong roller counts', () => {
    const tune = resolveTune(bike, {
      ...stock,
      rollerMassesG: [10, 10],
      parts: { ...stock.parts, ecu: 'deleted-part' },
    });
    expect(tune.cvt?.rollerMassesG).toHaveLength(6);
    expect(tune.ecu.revLimitRpm).toBe(bike.engine.revLimitRpm);
  });

  it('validates as a preset payload', () => {
    expect(TuneSelectionSchema.safeParse(stock).success).toBe(true);
    expect(TuneSelectionSchema.safeParse({ ...stock, riderMassKg: -5 }).success).toBe(false);
  });
});

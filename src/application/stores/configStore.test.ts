import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_BIKE_ID, getBike, STOCK_PART_ID } from '@/data';
import { createPreset } from '../services/presetService';
import { createStockSelection } from '../tuning/selection';
import { useConfigStore } from './configStore';

const store = () => useConfigStore.getState();
const STOCK_ROLLER_G = createStockSelection(getBike(DEFAULT_BIKE_ID)).rollerMassesG[0];

describe('configStore', () => {
  beforeEach(() => {
    store().selectBike(DEFAULT_BIKE_ID);
  });

  it('starts on the default bike with all-stock parts', () => {
    expect(store().bikeId).toBe(DEFAULT_BIKE_ID);
    expect(store().selection).toEqual(createStockSelection(getBike(DEFAULT_BIKE_ID)));
  });

  it('switching bikes resets to that bike’s stock setup', () => {
    store().setPart('ecu', 'ecu-stage-2');
    store().selectBike('sym-jet-sl-125');
    expect(store().selection.parts.ecu).toBe(STOCK_PART_ID);
    expect(store().selection.rollerMassesG[0]).toBe(12);
  });

  it('edits individual rollers and whole sets', () => {
    store().setRoller(2, 15);
    expect(store().selection.rollerMassesG[2]).toBe(15);
    expect(store().selection.rollerMassesG[0]).toBe(STOCK_ROLLER_G);
    store().setAllRollers(14);
    expect(new Set(store().selection.rollerMassesG)).toEqual(new Set([14]));
  });

  it('resets one group without touching others', () => {
    store().setPart('ecu', 'ecu-stage-1');
    store().setPart('variator', 'variator-launch');
    store().setAllRollers(14);
    store().setRiderMass(90);
    store().reset('ecu');
    store().reset('rollers');
    store().reset('mass');
    expect(store().selection.parts.ecu).toBe(STOCK_PART_ID);
    expect(store().selection.parts.variator).toBe('variator-launch');
    expect(store().selection.rollerMassesG[0]).toBe(STOCK_ROLLER_G);
    expect(store().selection.riderMassKg).toBe(70);
  });

  it('resetAll restores stock and flat road', () => {
    store().setPart('ecu', 'ecu-stage-1');
    store().setExtraMass(10);
    store().setGrade(5);
    store().resetAll();
    expect(store().selection).toEqual(createStockSelection(getBike(DEFAULT_BIKE_ID)));
    expect(store().gradePercent).toBe(0);
  });

  it('applies a preset, including its bike', () => {
    const jet = getBike('sym-jet-sl-125');
    const sel = { ...createStockSelection(jet), riderMassKg: 55 };
    store().applyPreset(createPreset('輕騎士', jet.id, sel));
    expect(store().bikeId).toBe(jet.id);
    expect(store().selection.riderMassKg).toBe(55);
  });
});

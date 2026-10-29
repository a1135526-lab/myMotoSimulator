import { describe, expect, it } from 'vitest';
import { armTimer, IDLE_TIMER } from '@/domain';
import { getBike } from '@/data';
import { buildSimConfig } from '../hooks/useSimConfig';
import { computeDyno } from '../services/dynoService';
import { createStockSelection } from '../tuning/selection';
import { toChassisRows, toEngineRows, toSummary, type LabelledRun } from './dynoCharts';
import { speedoMaxFor, toGaugeScale, toTimerView } from './telemetry';

const bike = getBike('sym-drg-158');
const stockConfig = buildSimConfig(bike, createStockSelection(bike));
const tunedConfig = buildSimConfig(bike, {
  ...createStockSelection(bike),
  parts: { ...createStockSelection(bike).parts, ecu: 'ecu-stage-2' },
});

const runs: LabelledRun[] = [
  { key: 'stock', label: '原廠', result: computeDyno(stockConfig) },
  { key: 'current', label: '目前改裝', result: computeDyno(tunedConfig) },
];

describe('dyno view models', () => {
  it('memoises identical configurations', () => {
    expect(computeDyno(stockConfig)).toBe(runs[0]?.result);
  });

  it('merges engine series by rpm, extending to the higher rev limit', () => {
    const rows = toEngineRows(runs);
    const last = rows[rows.length - 1];
    expect(last?.rpm).toBe(bike.engine.revLimitRpm + 700);
    expect(last?.stockPs).toBeUndefined();
    expect(last?.currentPs).toBeGreaterThan(0);
  });

  it('merges chassis series by km/h', () => {
    const rows = toChassisRows(runs);
    expect(rows[0]?.speedKmh).toBe(1);
    expect(rows[50]?.stockRpm).toBeGreaterThan(5000);
  });

  it('summarises peaks in ps / kgf·m', () => {
    const stock = toSummary(runs[0] as LabelledRun);
    expect(stock.peakPs).toBeCloseTo(16, 0);
    expect(stock.peakKgfm).toBeCloseTo(1.54, 2);
    expect(toSummary(runs[1] as LabelledRun).peakPs).toBeGreaterThan(stock.peakPs);
  });
});

describe('telemetry view models', () => {
  it('sizes the tach from the tuned rev limit', () => {
    const scale = toGaugeScale(tunedConfig);
    expect(scale.redlineRpm).toBe(10200);
    expect(scale.tachMaxRpm).toBe(12000);
  });

  it('rounds the speedo to tidy steps', () => {
    expect(speedoMaxFor(107)).toBe(140);
    expect(speedoMaxFor(135)).toBe(160);
  });

  it('labels timer phases and splits', () => {
    expect(toTimerView(IDLE_TIMER).phaseLabel).toMatch(/Space/);
    expect(toTimerView(armTimer()).splits.map((s) => s.label)).toContain('0–400 m');
  });
});

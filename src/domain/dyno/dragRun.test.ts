import { describe, expect, it } from 'vitest';
import { MANUAL_TEST_BIKE } from '../../test/fixtures/manualTestBike';
import { makeConfig } from '../../test/fixtures/simConfig';
import { dragRun } from './dragRun';

const withEnv = (env: Partial<ReturnType<typeof makeConfig>['environment']>) => {
  const c = makeConfig((t) => t, MANUAL_TEST_BIKE);
  return { ...c, environment: { ...c.environment, ...env } };
};

describe('dragRun', () => {
  it('times a pass and reports trap speed', () => {
    const r = dragRun(makeConfig(), 201);
    expect(r.etS).toBeGreaterThan(5);
    expect(r.etS).toBeLessThan(15);
    expect(r.trapSpeedKmh).toBeGreaterThan(60);
  });

  it('longer distance takes longer', () => {
    const c = makeConfig();
    expect(dragRun(c, 402).etS ?? 0).toBeGreaterThan(dragRun(c, 201).etS ?? Infinity);
  });

  it('low grip, thin air and an uphill grade all slow it down', () => {
    const base = dragRun(withEnv({}), 402).etS ?? 0;
    expect(dragRun(withEnv({ tractionG: 0.5 }), 402).etS).toBeGreaterThan(base);
    expect(dragRun(withEnv({ gradePercent: 5 }), 402).etS).toBeGreaterThan(base);
  });

  it('gives up on an impossible climb', () => {
    expect(dragRun(withEnv({ gradePercent: 15, tractionG: 0.3 }), 3000).etS).toBeNull();
  });
});

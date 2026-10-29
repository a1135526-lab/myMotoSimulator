import { describe, expect, it, vi } from 'vitest';
import { getBike } from '@/data';
import { buildSimConfig } from '../hooks/useSimConfig';
import { createStockSelection } from '../tuning/selection';
import { SimulationController, type SimSnapshot } from './SimulationController';

const bike = getBike('sym-jet-sl-125');
const config = buildSimConfig(bike, createStockSelection(bike));

function setup() {
  const publish = vi.fn<(s: SimSnapshot) => void>();
  const controller = new SimulationController(config, publish);
  const latest = () => publish.mock.lastCall?.[0];
  return { controller, publish, latest };
}

describe('SimulationController', () => {
  it('accelerates while the throttle is held and publishes snapshots', () => {
    const { controller, latest } = setup();
    controller.touch.press('throttle');
    for (let i = 0; i < 180; i++) controller.tick(1 / 60);
    expect(latest()?.sim.speedMps).toBeGreaterThan(5);
  });

  it('does not publish when no physics step elapsed', () => {
    const { controller, publish } = setup();
    controller.tick(0.0001);
    expect(publish).not.toHaveBeenCalled();
  });

  it('runs the performance timer from the simulated states', () => {
    const { controller, latest } = setup();
    controller.handleAction('toggleTimer');
    expect(latest()?.timer.phase).toBe('armed');
    controller.touch.press('throttle');
    for (let i = 0; i < 60 * 12; i++) controller.tick(1 / 60);
    expect(latest()?.timer.times.zeroTo100mS).toBeGreaterThan(7);
  });

  it('reset returns to standstill and re-arms an active timer', () => {
    const { controller, latest } = setup();
    controller.toggleTimer();
    controller.touch.press('throttle');
    for (let i = 0; i < 120; i++) controller.tick(1 / 60);
    controller.handleAction('reset');
    expect(latest()?.sim.speedMps).toBe(0);
    expect(latest()?.timer.phase).toBe('armed');
  });

  it('keeps running state when parts change', () => {
    const { controller } = setup();
    controller.touch.press('throttle');
    for (let i = 0; i < 120; i++) controller.tick(1 / 60);
    const before = controller.snapshot().sim.speedMps;
    controller.setConfig({ ...config, tune: { ...config.tune, extraMassKg: 20 } });
    expect(controller.snapshot().sim.speedMps).toBe(before);
    controller.dispose();
  });
});

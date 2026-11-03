import { describe, expect, it, vi } from 'vitest';
import { toWorld } from '@/domain';
import { getBike, getCircuit } from '@/data';
import { buildSimConfig } from '../hooks/useSimConfig';
import { circuitEnvironment, computeLapEstimate } from '../services/lapService';
import { createStockSelection } from '../tuning/selection';
import { toCircuitView } from '../viewModels/circuit';
import {
  CircuitController,
  type LapListener,
  type CircuitConfig,
  type CircuitSnapshot,
} from './CircuitController';

const circuit = getCircuit('practice-park');
const env = circuitEnvironment(circuit);
const jet = getBike('sym-jet-sl-125');
const ninja = getBike('kawasaki-ninja-400');

const config: CircuitConfig = {
  circuit,
  player: buildSimConfig(jet, createStockSelection(jet), env),
  opponents: [buildSimConfig(ninja, createStockSelection(ninja), env)],
  names: ['你', 'Ninja #1'],
  skill: 'pro',
  laps: 1,
  assist: true,
  brakeAssist: true,
  autoShift: true,
  autoClutch: true,
  ghost: null,
};

function setup(patch: Partial<CircuitConfig> = {}) {
  const publish = vi.fn<(s: CircuitSnapshot) => void>();
  const camera = vi.fn();
  const onLap = vi.fn<LapListener>();
  const controller = new CircuitController(
    { ...config, ...patch },
    publish,
    camera,
    () => 0,
    onLap,
  );
  const view = () => {
    const s = publish.mock.lastCall?.[0];
    if (!s) throw new Error('nothing published');
    return toCircuitView(s.race, s.geo, s.models, s.names);
  };
  const snapshot = () => {
    const s = publish.mock.lastCall?.[0];
    if (!s) throw new Error('nothing published');
    return s;
  };
  return { controller, camera, view, snapshot, onLap };
}

const runFor = (c: CircuitController, seconds: number) => {
  for (let i = 0; i < seconds * 30; i++) c.tick(1 / 30);
};

/** Lights out, then full throttle (the assists ride the line) until a lap is done. */
function rideFirstLap(
  c: CircuitController,
  onLap: ReturnType<typeof setup>['onLap'],
  during = () => {},
) {
  c.go();
  runFor(c, 7);
  c.touch.press('throttle');
  for (let i = 0; i < 30 * 200 && onLap.mock.calls.length === 0; i++) {
    c.tick(1 / 30);
    if (i === 30 * 20) during();
  }
  const lap = onLap.mock.calls[0]?.[0];
  if (!lap) throw new Error('no lap completed');
  return lap;
}

describe('CircuitController laps and the ghost', () => {
  it('a clean lap is recorded tenth by tenth and becomes the ghost', () => {
    // Two laps: once the race is over there's no ghost to show.
    const { controller, snapshot, onLap } = setup({ laps: 2 });
    const lap = rideFirstLap(controller, onLap);
    expect(lap.clean).toBe(true);
    expect(lap.lapS).toBeGreaterThan(20);
    expect(lap.samples.length).toBeGreaterThan(lap.lapS * 9);
    expect(lap.samples[lap.samples.length - 1]?.t).toBeCloseTo(lap.lapS, 6);
    expect(snapshot().ghost?.lapS).toBe(lap.lapS);

    // Next lap: the ghost rides alongside.
    runFor(controller, 3);
    const s = snapshot();
    const v = toCircuitView(s.race, s.geo, s.models, s.names, s.ghost);
    expect(v.ghost).not.toBeNull();
    expect(v.ghost?.lapS).toBe(lap.lapS);
  }, 60_000);

  it('a lap with R pressed does not count', () => {
    const { controller, snapshot, onLap } = setup();
    const lap = rideFirstLap(controller, onLap, () => controller.handleAction('reset'));
    expect(lap.clean).toBe(false);
    expect(snapshot().ghost).toBeNull();
  }, 60_000);
});

describe('CircuitController', () => {
  it('starts on the grid and runs the lights on Space', () => {
    const { controller, view } = setup();
    expect(view().phase).toBe('grid');
    controller.handleAction('toggleTimer');
    runFor(controller, 2.2);
    expect(view().phase).toBe('lights');
    expect(view().lightsLit).toBe(2);
  });

  it('after lights out the AI pulls away and laps are tracked', () => {
    const { controller, view } = setup();
    controller.go();
    runFor(controller, 20);
    const v = view();
    expect(v.phase).toBe('racing');
    expect(v.riders[1]?.speedKmh).toBeGreaterThan(30);
    expect(v.riders[1]?.position).toBe(1);
    expect(v.player.lap).toBe(1);
  });

  it('the player accelerates on throttle and leans through the first corner', () => {
    const { controller, view } = setup();
    controller.go();
    runFor(controller, 7);
    controller.touch.press('throttle');
    let maxLean = 0;
    for (let i = 0; i < 30 * 30; i++) {
      controller.tick(1 / 30);
      maxLean = Math.max(maxLean, Math.abs(view().player.leanDeg));
    }
    expect(view().riders[0]?.speedKmh).toBeGreaterThan(20);
    expect(maxLean).toBeGreaterThan(10);
  });

  it.each([
    ['steerRight', 1],
    ['steerLeft', -1],
  ] as const)('%s moves the bike to that side of the screen', (control, side) => {
    const { controller, snapshot } = setup();
    // Offset from the centreline, projected on the camera's screen-right
    // (Three.js, y up: forward (cos h, 0, sin h) → right is (−sin h, 0, cos h)).
    const screenRight = () => {
      const { race, geo } = snapshot();
      const lat = race.riders[0]?.lat ?? { s: 0, d: 0 };
      const centre = toWorld(geo, lat.s, 0);
      const bike = toWorld(geo, lat.s, lat.d);
      const h = centre.heading;
      return (bike.x - centre.x) * -Math.sin(h) + (bike.z - centre.z) * Math.cos(h);
    };
    controller.go();
    runFor(controller, 7);
    controller.touch.press('throttle');
    runFor(controller, 3);
    const before = screenRight();
    controller.touch.press(control);
    runFor(controller, 1.5);
    expect((screenRight() - before) * side).toBeGreaterThan(1);
  });

  it('braking while steering slides the bike into the turn', () => {
    const { controller, view } = setup();
    controller.go();
    runFor(controller, 7);
    controller.touch.press('throttle');
    runFor(controller, 5);
    controller.touch.release('throttle');
    controller.touch.press('brake');
    controller.touch.press('steerRight');
    runFor(controller, 0.4);
    expect(view().player.driftPct).toBeGreaterThan(50);
    expect(view().riders[0]?.slip).toBeLessThan(0);
    controller.touch.release('brake');
    controller.touch.release('steerRight');
    runFor(controller, 1);
    expect(view().player.driftPct).toBe(0);
  });

  it('V toggles the camera; R puts the player back on track', () => {
    const { controller, camera, view } = setup();
    controller.handleAction('toggleCamera');
    expect(camera).toHaveBeenCalledOnce();
    controller.handleAction('reset');
    expect(view().player.offTrack).toBe(false);
    controller.dispose();
  });
});

describe('lap estimate service', () => {
  it('ranks a sportbike ahead of a 125 scooter', () => {
    expect(computeLapEstimate(config.opponents[0] ?? config.player, circuit)).toBeLessThan(
      computeLapEstimate(config.player, circuit),
    );
  });
});

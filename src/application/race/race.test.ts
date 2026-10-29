import { describe, expect, it, vi } from 'vitest';
import { getBike } from '@/data';
import { buildSimConfig } from '../hooks/useSimConfig';
import { createStockSelection } from '../tuning/selection';
import { toRaceView } from '../viewModels/race';
import { selectionForLevel } from './opponentSetup';
import { RaceController, type RaceConfig, type RaceSnapshot } from './RaceController';

const jet = getBike('sym-jet-sl-125');
const ninja = getBike('kawasaki-ninja-400');

const config = (distanceM = 201): RaceConfig => ({
  player: buildSimConfig(jet, createStockSelection(jet)),
  opponent: buildSimConfig(ninja, selectionForLevel(ninja, 'stock', 70)),
  opponentSkill: 'pro',
  settings: { distanceM, treeMode: 'pro' },
});

function setup(distanceM?: number) {
  const publish = vi.fn<(s: RaceSnapshot) => void>();
  // random() = 0 → shortest stage delay, opponent reaction at the low end.
  const controller = new RaceController(config(distanceM), publish, () => 0);
  const latest = () => {
    const snap = publish.mock.lastCall?.[0];
    if (!snap) throw new Error('nothing published');
    return snap;
  };
  return { controller, latest };
}

const runFor = (c: RaceController, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) c.tick(1 / 60);
};

describe('opponent tune levels', () => {
  it('stock keeps stock parts; mild/full add ECU and intake parts', () => {
    expect(selectionForLevel(jet, 'stock', 60).parts.ecu).toBe('stock');
    expect(selectionForLevel(jet, 'stock', 60).riderMassKg).toBe(60);
    const mild = selectionForLevel(jet, 'mild', 70);
    expect(mild.parts.ecu).toBe('ecu-stage-1');
    expect(mild.rollerMassesG[0]).toBe(11);
    const full = selectionForLevel(jet, 'full', 70);
    expect(full.parts.variator).toBe('variator-full-range');
    expect(full.parts.ecu).toBe('ecu-stage-2');
  });

  it('never applies CVT parts to a manual bike', () => {
    const full = selectionForLevel(ninja, 'full', 70);
    expect(full.parts.variator).toBe('stock');
    expect(full.rollerMassesG).toEqual([]);
  });
});

describe('RaceController', () => {
  it('starts staged and only runs the tree after go()', () => {
    const { controller, latest } = setup();
    runFor(controller, 1);
    expect(latest().race.phase).toBe('staged');
    controller.handleAction('toggleTimer');
    expect(latest().race.phase).toBe('countdown');
  });

  it('runs a full race to a result, then Space goes back to the line', () => {
    const { controller, latest } = setup();
    controller.go();
    runFor(controller, 1.5);
    controller.touch.press('throttle');
    runFor(controller, 30);
    const { race, models } = latest();
    const view = toRaceView(race, models);
    expect(view.phase).toBe('finished');
    expect(view.result?.winner).toBe('opponent');
    expect(view.player.label).toBe('SYM JET SL 125');

    controller.go();
    expect(latest().race.phase).toBe('staged');
  });

  it('R restages mid-race and reconfigure rebuilds with the new distance', () => {
    const { controller, latest } = setup();
    controller.go();
    runFor(controller, 2);
    controller.handleAction('reset');
    expect(latest().race.phase).toBe('staged');
    controller.configure(config(1000));
    expect(latest().race.settings.distanceM).toBe(1000);
    controller.dispose();
  });

  it('shift / start actions are no-ops on a scooter', () => {
    const { controller, latest } = setup();
    const before = latest().race;
    controller.handleAction('shiftUp');
    controller.handleAction('startEngine');
    expect(latest().race).toBe(before);
  });
});

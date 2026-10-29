import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBike } from '@/data';
import { selectionForLevel } from '../race/opponentSetup';
import { RaceController, type RaceConfig } from '../race/RaceController';
import { useConfigStore } from '../stores/configStore';
import { useRaceStore } from '../stores/raceStore';
import { toRaceView } from '../viewModels/race';
import { RaceContext } from './raceContext';
import { useKeyboardControls } from './useKeyboardControls';
import { buildSimConfig, useCurrentBike } from './useSimConfig';
import { useSimulationLoop } from './useSimulationLoop';

/** Player = the bike and tune currently set up in the simulator; opponent from race setup. */
function useRaceConfig(): RaceConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const distanceM = useRaceStore((s) => s.distanceM);
  const treeMode = useRaceStore((s) => s.treeMode);
  const opponent = useRaceStore((s) => s.opponent);

  return useMemo(() => {
    const oppBike = getBike(opponent.bikeId);
    return {
      // Drag strips are flat, whatever grade the simulator is set to.
      player: buildSimConfig(bike, selection, 0),
      opponent: buildSimConfig(
        oppBike,
        selectionForLevel(oppBike, opponent.tuneLevel, opponent.riderMassKg),
        0,
      ),
      opponentSkill: opponent.skill,
      settings: { distanceM, treeMode },
    };
  }, [bike, selection, distanceM, treeMode, opponent]);
}

export function RaceProvider({ children }: { children: ReactNode }) {
  const config = useRaceConfig();
  const [controller] = useState(
    () =>
      new RaceController(config, ({ race, models }) =>
        useRaceStore.getState().publish(toRaceView(race, models)),
      ),
  );
  const applied = useRef(config);

  useEffect(() => {
    if (applied.current === config) return;
    applied.current = config;
    controller.configure(config);
  }, [controller, config]);

  useEffect(() => () => controller.dispose(), [controller]);

  useSimulationLoop(controller);
  useKeyboardControls(controller);

  return <RaceContext.Provider value={controller}>{children}</RaceContext.Provider>;
}

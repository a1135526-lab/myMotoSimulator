import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBike } from '@/data';
import { selectionForLevel } from '../race/opponentSetup';
import { RaceController, type RaceConfig } from '../race/RaceController';
import { useConfigStore } from '../stores/configStore';
import { useRaceStore } from '../stores/raceStore';
import { toRaceView } from '../viewModels/race';
import { RaceContext } from './raceContext';
import { useKeyboardControls } from './useKeyboardControls';
import { useActiveTrack } from './useRaceSetup';
import { buildSimConfig, useCurrentBike } from './useSimConfig';
import { useSimulationLoop } from './useSimulationLoop';

/** Player = the garage bike and tune; opponent and venue from the race setup. */
function useRaceConfig(): RaceConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const { track, distanceM } = useActiveTrack();
  const treeMode = useRaceStore((s) => s.treeMode);
  const opponent = useRaceStore((s) => s.opponent);
  const autoClutch = useRaceStore((s) => s.autoClutch);

  return useMemo(() => {
    const oppBike = getBike(opponent.bikeId);
    const env = track.environment;
    return {
      player: buildSimConfig(bike, selection, env),
      opponent: buildSimConfig(
        oppBike,
        selectionForLevel(oppBike, opponent.tuneLevel, opponent.riderMassKg),
        env,
      ),
      opponentSkill: opponent.skill,
      settings: { distanceM, treeMode, autoClutch },
    };
  }, [bike, selection, track, distanceM, treeMode, autoClutch, opponent]);
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

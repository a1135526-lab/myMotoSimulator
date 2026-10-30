import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cityEnvironment, CITY_GRIP_G, cityMap } from '../street/city';
import { StreetController, type StreetConfig } from '../street/StreetController';
import { useConfigStore } from '../stores/configStore';
import { TRAFFIC_CARS, useStreetStore } from '../stores/streetStore';
import { toStreetView } from '../viewModels/street';
import { StreetContext } from './streetContext';
import { useKeyboardControls } from './useKeyboardControls';
import { buildSimConfig, useCurrentBike } from './useSimConfig';
import { useSimulationLoop } from './useSimulationLoop';

/** Seed for where the traffic starts; the city itself has its own. */
const TRAFFIC_SEED = 42;

/** Garage bike and tune, loose in the city. */
function useStreetConfig(): StreetConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const traffic = useStreetStore((s) => s.traffic);
  const autoShift = useStreetStore((s) => s.autoShift);
  const autoClutch = useStreetStore((s) => s.autoClutch);
  return useMemo(
    () => ({
      player: buildSimConfig(bike, selection, cityEnvironment()),
      map: cityMap(),
      settings: {
        gripG: CITY_GRIP_G,
        autoShift,
        autoClutch,
        trafficCount: TRAFFIC_CARS[traffic],
        seed: TRAFFIC_SEED,
      },
    }),
    [bike, selection, traffic, autoShift, autoClutch],
  );
}

export function StreetProvider({ children }: { children: ReactNode }) {
  const config = useStreetConfig();
  const [controller] = useState(
    () =>
      new StreetController(
        config,
        ({ state, model, map }) =>
          useStreetStore.getState().publish(toStreetView(state, model, map)),
        () => useStreetStore.getState().toggleCamera(),
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
  useKeyboardControls(controller, 'circuit');

  return <StreetContext.Provider value={controller}>{children}</StreetContext.Provider>;
}

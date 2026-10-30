import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CityMap } from '@/domain';
import { cityEnvironment, CITY_GRIP_G } from '../street/city';
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
function useStreetConfig(map: CityMap): StreetConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const traffic = useStreetStore((s) => s.traffic);
  const autoShift = useStreetStore((s) => s.autoShift);
  const autoClutch = useStreetStore((s) => s.autoClutch);
  return useMemo(
    () => ({
      player: buildSimConfig(bike, selection, cityEnvironment()),
      map,
      settings: {
        gripG: CITY_GRIP_G,
        autoShift,
        autoClutch,
        trafficCount: TRAFFIC_CARS[traffic],
        seed: TRAFFIC_SEED,
      },
    }),
    [bike, selection, traffic, autoShift, autoClutch, map],
  );
}

/** Runs a ride in a loaded city (see useCityMap). */
export function StreetProvider({ map, children }: { map: CityMap; children: ReactNode }) {
  const config = useStreetConfig(map);
  const [controller] = useState(
    () =>
      new StreetController(
        config,
        ({ state, model, map }) =>
          useStreetStore.getState().publish(toStreetView(state, model, map)),
        () => useStreetStore.getState().toggleCamera(),
        () => {
          const store = useStreetStore.getState();
          store.setMapOpen(!store.mapOpen);
        },
      ),
  );
  const mapOpen = useStreetStore((s) => s.mapOpen);
  useEffect(() => controller.setPaused(mapOpen), [controller, mapOpen]);
  const applied = useRef(config);

  useEffect(() => {
    if (applied.current === config) return;
    applied.current = config;
    controller.configure(config);
  }, [controller, config]);

  useEffect(() => () => controller.dispose(), [controller]);

  useSimulationLoop(controller);
  useKeyboardControls(controller, 'street');

  return <StreetContext.Provider value={controller}>{children}</StreetContext.Provider>;
}

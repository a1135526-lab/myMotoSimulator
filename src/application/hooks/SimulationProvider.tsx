import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SimulationController } from '../simulation/SimulationController';
import { useSimStore } from '../stores/simStore';
import { SimulationContext } from './simulationContext';
import { useKeyboardControls } from './useKeyboardControls';
import { useSimConfig } from './useSimConfig';
import { useSimulationLoop } from './useSimulationLoop';

/**
 * Creates the one SimulationController for the app, keeps it in sync with the
 * selected configuration, and wires the render loop and keyboard.
 */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const config = useSimConfig();
  const [controller] = useState(
    () => new SimulationController(config, (snap) => useSimStore.getState().publish(snap)),
  );
  const bikeIdRef = useRef(config.bike.id);

  useEffect(() => {
    controller.setConfig(config);
    if (bikeIdRef.current !== config.bike.id) {
      bikeIdRef.current = config.bike.id;
      controller.reset();
    }
  }, [controller, config]);

  useEffect(() => () => controller.dispose(), [controller]);

  useSimulationLoop(controller);
  useKeyboardControls(controller);

  return <SimulationContext.Provider value={controller}>{children}</SimulationContext.Provider>;
}

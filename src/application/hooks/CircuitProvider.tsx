import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBike, getCircuit } from '@/data';
import { CircuitController, type CircuitConfig } from '../race/CircuitController';
import { selectionForLevel } from '../race/opponentSetup';
import { circuitEnvironment } from '../services/lapService';
import { useCircuitStore } from '../stores/circuitStore';
import { useConfigStore } from '../stores/configStore';
import { useRaceStore } from '../stores/raceStore';
import { toCircuitView } from '../viewModels/circuit';
import { CircuitContext } from './circuitContext';
import { useKeyboardControls } from './useKeyboardControls';
import { buildSimConfig, useCurrentBike } from './useSimConfig';
import { useSimulationLoop } from './useSimulationLoop';

/** Player = garage bike/tune; opponents = N copies of the chosen opponent. */
function useCircuitConfig(): CircuitConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const circuitId = useRaceStore((s) => s.circuitId);
  const laps = useRaceStore((s) => s.laps);
  const count = useRaceStore((s) => s.opponentCount);
  const assist = useRaceStore((s) => s.assist);
  const brakeAssist = useRaceStore((s) => s.brakeAssist);
  const autoShift = useRaceStore((s) => s.autoShift);
  const opponent = useRaceStore((s) => s.opponent);

  return useMemo(() => {
    const circuit = getCircuit(circuitId);
    const env = circuitEnvironment(circuit);
    const oppBike = getBike(opponent.bikeId);
    const oppConfig = buildSimConfig(
      oppBike,
      selectionForLevel(oppBike, opponent.tuneLevel, opponent.riderMassKg),
      env,
    );
    const opponents = Array.from({ length: count }, () => oppConfig);
    return {
      circuit,
      player: buildSimConfig(bike, selection, env),
      opponents,
      names: ['你', ...opponents.map((_, i) => `${oppBike.brand} ${oppBike.model} #${i + 1}`)],
      skill: opponent.skill,
      laps,
      assist,
      brakeAssist,
      autoShift,
    };
  }, [bike, selection, circuitId, laps, count, assist, brakeAssist, autoShift, opponent]);
}

export function CircuitProvider({ children }: { children: ReactNode }) {
  const config = useCircuitConfig();
  const [controller] = useState(
    () =>
      new CircuitController(
        config,
        ({ race, geo, models, names }) =>
          useCircuitStore.getState().publish(toCircuitView(race, geo, models, names)),
        () => useCircuitStore.getState().toggleCamera(),
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

  return <CircuitContext.Provider value={controller}>{children}</CircuitContext.Provider>;
}

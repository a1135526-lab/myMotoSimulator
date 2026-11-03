import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBike, getCircuit } from '@/data';
import { CircuitController, type CircuitConfig } from '../race/CircuitController';
import { sendScore, submitLap } from '../online/leaderboard';
import type { CompletedLap } from '../race/lapRecorder';
import { selectionForLevel } from '../race/opponentSetup';
import { circuitEnvironment } from '../services/lapService';
import { useCircuitStore } from '../stores/circuitStore';
import { useConfigStore } from '../stores/configStore';
import { useRaceStore } from '../stores/raceStore';
import { roomFrame, useCircuitRoom } from '../online/room/circuitRoom';
import { useRoomStore } from '../online/room/roomStore';
import { loadGhost, saveGhost, useRecordsStore } from '../stores/recordsStore';
import { useUiStore } from '../stores/uiStore';
import { toCircuitView } from '../viewModels/circuit';
import { CircuitContext } from './circuitContext';
import { useFlickShift } from './useFlickShift';
import { useInputSources } from './useInputSources';
import { useTiltSteering } from './useTiltSteering';
import { buildSimConfig, useCurrentBike } from './useSimConfig';
import { useSimulationLoop } from './useSimulationLoop';

/** Player = garage bike/tune; opponents = N copies of the chosen opponent. */
function useCircuitConfig(): CircuitConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  // A friend room uses the host's circuit and laps, and has no AI riders.
  const inRoom = useRaceStore((s) => s.discipline === 'room');
  const roomSettings = useRoomStore((s) => s.settings);
  const garageCircuit = useRaceStore((s) => s.circuitId);
  const garageLaps = useRaceStore((s) => s.laps);
  const garageCount = useRaceStore((s) => s.opponentCount);
  const circuitId = inRoom ? roomSettings.circuitId : garageCircuit;
  const laps = inRoom ? roomSettings.laps : garageLaps;
  const count = inRoom ? 0 : garageCount;
  const assist = useRaceStore((s) => s.assist);
  const brakeAssist = useRaceStore((s) => s.brakeAssist);
  const autoShift = useRaceStore((s) => s.autoShift);
  const autoClutch = useRaceStore((s) => s.autoClutch);
  const opponent = useRaceStore((s) => s.opponent);
  const rival = useUiStore((s) => s.rivalGhost);

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
      autoClutch,
      // Racing someone from the global board, else your own best.
      ghost: rival?.circuitId === circuit.id ? rival.ghost : loadGhost(circuit.id),
    };
  }, [
    bike,
    selection,
    circuitId,
    laps,
    count,
    assist,
    brakeAssist,
    autoShift,
    autoClutch,
    opponent,
    rival,
  ]);
}

/**
 * Clean laps go on this circuit's board; a new best also becomes its ghost.
 * Every lap gets a short notice.
 */
function recordLap(config: CircuitConfig, lap: CompletedLap): void {
  const circuitId = config.circuit.id;
  const bike = config.player.bike;
  const previousBest = useRecordsStore.getState().laps[circuitId]?.[0]?.lapS ?? Infinity;
  const place = lap.clean
    ? useRecordsStore.getState().addLap(circuitId, {
        lapS: lap.lapS,
        bike: `${bike.brand} ${bike.model}`,
        manual: bike.kind === 'manual',
        assisted: config.assist || config.brakeAssist,
        at: Date.now(),
      })
    : null;
  const best = lap.clean && lap.lapS < previousBest;
  if (best) {
    saveGhost(circuitId, {
      lapS: lap.lapS,
      samples: lap.samples,
      bike: `${bike.brand} ${bike.model}`,
      manual: bike.kind === 'manual',
    });
  }
  const notice = {
    lapS: lap.lapS,
    place,
    clean: lap.clean,
    best,
    atS: lap.atS,
    online: { state: 'off' } as const,
  };
  useCircuitStore.getState().setLapNotice(notice);
  if (!lap.clean) return;
  sendScore(
    () =>
      submitLap({
        circuitId,
        assisted: config.assist || config.brakeAssist,
        lapS: lap.lapS,
        bike: `${bike.brand} ${bike.model}`,
        manual: bike.kind === 'manual',
        samples: lap.samples,
      }),
    (online) => {
      // Only if it's still this lap's notice on screen.
      const shown = useCircuitStore.getState().lapNotice;
      if (shown?.atS === lap.atS) useCircuitStore.getState().setLapNotice({ ...shown, online });
    },
  );
}

export function CircuitProvider({ children }: { children: ReactNode }) {
  const config = useCircuitConfig();
  const applied = useRef(config);
  const inRoom = useRaceStore((s) => s.discipline === 'room');
  const [controller] = useState(
    () =>
      new CircuitController(
        config,
        ({ race, geo, models, names, ghost }) =>
          useCircuitStore
            .getState()
            .publish(
              roomFrame(
                toCircuitView(
                  race,
                  geo,
                  models,
                  names,
                  useUiStore.getState().ghostOn ? ghost : null,
                ),
              ),
            ),
        () => useCircuitStore.getState().toggleCamera(),
        Math.random,
        (lap) => recordLap(applied.current, lap),
      ),
  );

  useEffect(() => {
    if (applied.current === config) return;
    applied.current = config;
    controller.configure(config);
  }, [controller, config]);

  useEffect(() => () => controller.dispose(), [controller]);

  useSimulationLoop(controller);
  useInputSources(controller, 'circuit');
  useFlickShift(controller);
  useTiltSteering(controller);
  useCircuitRoom(controller, inRoom);

  return <CircuitContext.Provider value={controller}>{children}</CircuitContext.Provider>;
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircuitController, type CircuitConfig } from '../race/CircuitController';
import { sendScore, submitLap } from '../online/leaderboard';
import type { CompletedLap } from '../race/lapRecorder';
import { useCircuitStore } from '../stores/circuitStore';
import { useRaceStore } from '../stores/raceStore';
import { roomFrame, useCircuitRoom } from '../online/room/circuitRoom';
import { observeCircuitMatch } from '../stats/matchRecorder';
import { useRankedStore } from '../online/ranked/rankedStore';
import { useRoomStore } from '../online/room/roomStore';
import { saveGhost, useRecordsStore } from '../stores/recordsStore';
import { useUiStore } from '../stores/uiStore';
import { toCircuitView } from '../viewModels/circuit';
import { finishWindowClosed, withFinishWindow } from '../race/finishWindow';
import { CircuitContext } from './circuitContext';
import { useFlickShift } from './useFlickShift';
import { useInputSources } from './useInputSources';
import { useCircuitConfig } from './useCircuitConfig';
import { useTiltSteering } from './useTiltSteering';
import { useSimulationLoop } from './useSimulationLoop';

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

const noWindow = () => false;
const isRankedAi = () =>
  useRaceStore.getState().discipline === 'ranked' && useRankedStore.getState().match?.kind === 'ai';

export function CircuitProvider({ children }: { children: ReactNode }) {
  const config = useCircuitConfig();
  const applied = useRef(config);
  // A friend room, or a ranked race against people (which runs in a room too).
  const discipline = useRaceStore((s) => s.discipline);
  const rankedRoom = useRankedStore((s) => s.match?.kind === 'room');
  const inRoom = discipline === 'room' || (discipline === 'ranked' && rankedRoom);
  // Ranked against the AI: the same 15 s after the first flag as a room.
  const rankedAi = useRankedStore((s) => discipline === 'ranked' && s.match?.kind === 'ai');
  const [controller] = useState(
    () =>
      new CircuitController(
        config,
        ({ race, geo, models, names, ghost }) => {
          const raw = toCircuitView(
            race,
            geo,
            models,
            names,
            useUiStore.getState().ghostOn ? ghost : null,
          );
          const view = isRankedAi() ? withFinishWindow(raw) : roomFrame(raw);
          const { circuit, laps, player } = applied.current;
          // Room races are filed by roomFrame once everyone is home.
          if (useRoomStore.getState().status !== 'racing') {
            observeCircuitMatch(view, circuit.id, laps, {
              label: `${player.bike.brand} ${player.bike.model}`,
              manual: player.bike.kind === 'manual',
            });
          }
          useCircuitStore.getState().publish(view);
        },
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
  useCircuitRoom(controller, inRoom, rankedAi ? finishWindowClosed : noWindow);

  return <CircuitContext.Provider value={controller}>{children}</CircuitContext.Provider>;
}

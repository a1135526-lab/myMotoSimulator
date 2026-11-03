import { useMemo } from 'react';
import { getBike, getCircuit } from '@/data';
import {
  RANKED_AI_OPPONENTS,
  RANKED_BIKES,
  rankedAiSkill,
  tierOf,
  type RankedGroup,
} from '@/domain';
import { useRankedStore } from '../online/ranked/rankedStore';
import { useRoomStore } from '../online/room/roomStore';
import type { CircuitConfig } from '../race/CircuitController';
import { selectionForLevel } from '../race/opponentSetup';
import { circuitEnvironment } from '../services/lapService';
import { useConfigStore } from '../stores/configStore';
import { useRaceStore } from '../stores/raceStore';
import { loadGhost } from '../stores/recordsStore';
import { useUiStore } from '../stores/uiStore';
import { createStockSelection } from '../tuning/selection';
import { buildSimConfig, useCurrentBike } from './useSimConfig';

/**
 * The race to run: the garage one (your bike and tune, the chosen circuit
 * and AI), a friend room's (host's circuit, no AI), or a ranked one (the
 * group's stock bike for everyone, no steering or braking assists, and — when
 * racing the AI — AI riders as strong as your tier).
 */
export function useCircuitConfig(): CircuitConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const discipline = useRaceStore((s) => s.discipline);
  const roomSettings = useRoomStore((s) => s.settings);
  const ranked = useRankedStore((s) => (discipline === 'ranked' ? s.match : null));
  const rankedPoints = useRankedStore((s) => (ranked ? (s.mine[ranked.group]?.points ?? 0) : 0));
  const garageCircuit = useRaceStore((s) => s.circuitId);
  const garageLaps = useRaceStore((s) => s.laps);
  const garageCount = useRaceStore((s) => s.opponentCount);
  const assist = useRaceStore((s) => s.assist);
  const brakeAssist = useRaceStore((s) => s.brakeAssist);
  const autoShift = useRaceStore((s) => s.autoShift);
  const autoClutch = useRaceStore((s) => s.autoClutch);
  const opponent = useRaceStore((s) => s.opponent);
  const rival = useUiStore((s) => s.rivalGhost);

  return useMemo(() => {
    const inRoom = discipline === 'room' || ranked?.kind === 'room';
    const rankedGroup: RankedGroup | null = ranked?.group ?? roomSettings.ranked ?? null;
    const circuitId = ranked
      ? ranked.circuitId
      : discipline === 'room'
        ? roomSettings.circuitId
        : garageCircuit;
    const laps = ranked ? ranked.laps : discipline === 'room' ? roomSettings.laps : garageLaps;
    const circuit = getCircuit(circuitId);
    const env = circuitEnvironment(circuit);

    // Ranked: the group's stock bike, for you and any AI alike.
    const rankedBike =
      rankedGroup && (ranked || inRoom) ? getBike(RANKED_BIKES[rankedGroup]) : null;
    const player = rankedBike
      ? buildSimConfig(rankedBike, createStockSelection(rankedBike), env)
      : buildSimConfig(bike, selection, env);

    let opponents: CircuitConfig['opponents'] = [];
    let names: string[] = ['你'];
    if (ranked?.kind === 'ai' && rankedBike) {
      opponents = Array.from({ length: RANKED_AI_OPPONENTS }, () => player);
      names = ['你', ...opponents.map((_, i) => `電腦 ${i + 1}`)];
    } else if (!inRoom) {
      const oppBike = getBike(opponent.bikeId);
      const oppConfig = buildSimConfig(
        oppBike,
        selectionForLevel(oppBike, opponent.tuneLevel, opponent.riderMassKg),
        env,
      );
      opponents = Array.from({ length: garageCount }, () => oppConfig);
      names = ['你', ...opponents.map((_, i) => `${oppBike.brand} ${oppBike.model} #${i + 1}`)];
    }

    const noAssists = rankedBike !== null;
    return {
      circuit,
      player,
      opponents,
      names,
      skill: opponent.skill,
      ...(ranked?.kind === 'ai' && { aiSkill: rankedAiSkill(tierOf(rankedPoints).index) }),
      laps,
      assist: noAssists ? false : assist,
      brakeAssist: noAssists ? false : brakeAssist,
      autoShift,
      autoClutch,
      // Racing someone from the global board, else your own best.
      ghost: rival?.circuitId === circuit.id ? rival.ghost : loadGhost(circuit.id),
    };
  }, [
    bike,
    selection,
    discipline,
    roomSettings,
    ranked,
    rankedPoints,
    garageCircuit,
    garageLaps,
    garageCount,
    assist,
    brakeAssist,
    autoShift,
    autoClutch,
    opponent,
    rival,
  ]);
}

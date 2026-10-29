import { useMemo } from 'react';
import { engineSweep, wattsToPs, type BikeSpec, type Environment, type SimConfig } from '@/domain';
import {
  BIKES,
  CIRCUITS,
  getBike,
  getCircuit,
  TRACKS,
  type CircuitSpec,
  type TrackSpec,
} from '@/data';
import { selectionForLevel, type TuneLevel } from '../race/opponentSetup';
import { computeDragRun } from '../services/dragService';
import { circuitEnvironment, computeLapEstimate } from '../services/lapService';
import { useConfigStore } from '../stores/configStore';
import { activeTrack, useRaceStore, type ActiveTrack, type Discipline } from '../stores/raceStore';
import { createStockSelection } from '../tuning/selection';
import { KIND_LABELS, LICENSE_LABELS } from './useCatalog';
import { buildSimConfig, useCurrentBike } from './useSimConfig';

export function useActiveTrack(): ActiveTrack {
  const trackId = useRaceStore((s) => s.trackId);
  const custom = useRaceStore((s) => s.customDistanceM);
  return useMemo(() => activeTrack(trackId, custom), [trackId, custom]);
}

export const useTracks = (): readonly TrackSpec[] => TRACKS;
export const useCircuits = (): readonly CircuitSpec[] => CIRCUITS;

export function useActiveCircuit(): CircuitSpec {
  const id = useRaceStore((s) => s.circuitId);
  return useMemo(() => getCircuit(id), [id]);
}

export interface Estimate {
  readonly seconds: number | null;
  readonly trapKmh: number | null;
}

/** Where the race happens, and how a bike is scored there (ET or lap time). */
export interface Venue {
  readonly discipline: Discipline;
  readonly name: string;
  readonly detail: string;
  readonly environment: Environment;
  readonly estimateLabel: string;
  estimate(config: SimConfig): Estimate;
}

export function useVenue(): Venue {
  const discipline = useRaceStore((s) => s.discipline);
  const laps = useRaceStore((s) => s.laps);
  const { track, distanceM } = useActiveTrack();
  const circuit = useActiveCircuit();
  return useMemo((): Venue => {
    if (discipline === 'circuit') {
      return {
        discipline,
        name: circuit.name,
        detail: `${laps} 圈`,
        environment: circuitEnvironment(circuit),
        estimateLabel: '預估單圈',
        estimate: (config) => ({ seconds: computeLapEstimate(config, circuit), trapKmh: null }),
      };
    }
    return {
      discipline,
      name: track.name,
      detail: `${distanceM} m`,
      environment: track.environment,
      estimateLabel: '預估 ET',
      estimate: (config) => {
        const r = computeDragRun(config, distanceM);
        return { seconds: r.etS, trapKmh: r.trapSpeedKmh };
      },
    };
  }, [discipline, laps, track, distanceM, circuit]);
}

export interface BikeCardView {
  readonly id: string;
  readonly name: string;
  readonly kind: BikeSpec['kind'];
  readonly badge: string;
  readonly ps: number;
  readonly massKg: number;
  /** ps per 100 kg incl. the default rider — the classic quick comparison. */
  readonly psPer100Kg: number;
  readonly cylinders: number;
  readonly displacementCc: number;
  readonly estimateLabel: string;
  /** Stock bike, default rider, at the selected venue. */
  readonly estimate: Estimate;
}

export function useBikeCards(): BikeCardView[] {
  const venue = useVenue();
  return useMemo(
    () =>
      BIKES.map((bike) => {
        const rider = bike.chassis.defaultRiderMassKg;
        const config = buildSimConfig(bike, createStockSelection(bike), venue.environment);
        return {
          id: bike.id,
          name: `${bike.brand} ${bike.model}`,
          kind: bike.kind,
          badge: `${LICENSE_LABELS[bike.licenseClass]}${KIND_LABELS[bike.kind]}`,
          ps: bike.engine.peakPower.ps,
          massKg: bike.chassis.curbMassKg,
          psPer100Kg: (bike.engine.peakPower.ps / (bike.chassis.curbMassKg + rider)) * 100,
          cylinders: bike.engine.cylinders,
          displacementCc: bike.engine.displacementCc,
          estimateLabel: venue.estimateLabel,
          estimate: venue.estimate(config),
        };
      }),
    [venue],
  );
}

export interface GarageEstimate {
  readonly label: string;
  readonly stock: Estimate;
  readonly current: Estimate;
  readonly peakPs: { readonly stock: number; readonly current: number };
}

/** Player's bike at the selected venue: stock vs the current garage setup. */
export function useGarageEstimate(): GarageEstimate {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const venue = useVenue();
  return useMemo(() => {
    const stockCfg = buildSimConfig(bike, createStockSelection(bike), venue.environment);
    const currentCfg = buildSimConfig(bike, selection, venue.environment);
    const peak = (cfg: SimConfig) => wattsToPs(engineSweep(cfg).peakPower.powerW);
    return {
      label: venue.estimateLabel,
      stock: venue.estimate(stockCfg),
      current: venue.estimate(currentCfg),
      peakPs: { stock: peak(stockCfg), current: peak(currentCfg) },
    };
  }, [bike, selection, venue]);
}

export interface MatchupEstimate {
  readonly label: string;
  readonly player: number | null;
  readonly opponent: number | null;
}

/** Head-to-head forecast (scripted riders, no reaction time) at the selected venue. */
export function useMatchupEstimate(
  bikeId: string,
  level: TuneLevel,
  riderMassKg: number,
): MatchupEstimate {
  const venue = useVenue();
  const player = useGarageEstimate().current.seconds;
  return useMemo(() => {
    const bike = getBike(bikeId);
    const config = buildSimConfig(
      bike,
      selectionForLevel(bike, level, riderMassKg),
      venue.environment,
    );
    return { label: venue.estimateLabel, player, opponent: venue.estimate(config).seconds };
  }, [bikeId, level, riderMassKg, venue, player]);
}

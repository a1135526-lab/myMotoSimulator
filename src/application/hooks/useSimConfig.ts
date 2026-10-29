import { useMemo } from 'react';
import { AIR_DENSITY_SEA_LEVEL, DEFAULT_TIMESTEP_S, type BikeSpec, type SimConfig } from '@/domain';
import { getBike } from '@/data';
import { useConfigStore } from '../stores/configStore';
import { createStockSelection, resolveTune, type TuneSelection } from '../tuning/selection';

export function buildSimConfig(
  bike: BikeSpec,
  selection: TuneSelection,
  gradePercent = 0,
): SimConfig {
  return {
    bike,
    tune: resolveTune(bike, selection),
    environment: { airDensity: AIR_DENSITY_SEA_LEVEL, gradePercent },
    timestepS: DEFAULT_TIMESTEP_S,
  };
}

export function useCurrentBike(): BikeSpec {
  const bikeId = useConfigStore((s) => s.bikeId);
  return useMemo(() => getBike(bikeId), [bikeId]);
}

/** SimConfig for the current bike + user selection; stable until something changes. */
export function useSimConfig(): SimConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const grade = useConfigStore((s) => s.gradePercent);
  return useMemo(() => buildSimConfig(bike, selection, grade), [bike, selection, grade]);
}

/** Same bike, all-stock parts — the baseline for dyno comparisons. */
export function useStockSimConfig(): SimConfig {
  const bike = useCurrentBike();
  const grade = useConfigStore((s) => s.gradePercent);
  return useMemo(() => buildSimConfig(bike, createStockSelection(bike), grade), [bike, grade]);
}

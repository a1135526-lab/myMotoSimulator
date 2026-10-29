import { useMemo } from 'react';
import {
  AIR_DENSITY_SEA_LEVEL,
  DEFAULT_TIMESTEP_S,
  DEFAULT_TRACTION_G,
  type BikeSpec,
  type Environment,
  type SimConfig,
} from '@/domain';
import { getBike } from '@/data';
import { useConfigStore } from '../stores/configStore';
import { createStockSelection, resolveTune, type TuneSelection } from '../tuning/selection';

export const DEFAULT_ENVIRONMENT: Environment = {
  airDensity: AIR_DENSITY_SEA_LEVEL,
  gradePercent: 0,
  tractionG: DEFAULT_TRACTION_G,
};

export function buildSimConfig(
  bike: BikeSpec,
  selection: TuneSelection,
  environment: Partial<Environment> = {},
): SimConfig {
  return {
    bike,
    tune: resolveTune(bike, selection),
    environment: { ...DEFAULT_ENVIRONMENT, ...environment },
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
  const gradePercent = useConfigStore((s) => s.gradePercent);
  return useMemo(
    () => buildSimConfig(bike, selection, { gradePercent }),
    [bike, selection, gradePercent],
  );
}

/** Same bike, all-stock parts — the baseline for dyno comparisons. */
export function useStockSimConfig(): SimConfig {
  const bike = useCurrentBike();
  const gradePercent = useConfigStore((s) => s.gradePercent);
  return useMemo(
    () => buildSimConfig(bike, createStockSelection(bike), { gradePercent }),
    [bike, gradePercent],
  );
}

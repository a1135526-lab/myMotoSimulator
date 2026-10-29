import {
  AIR_DENSITY_SEA_LEVEL,
  createStockTune,
  DEFAULT_TIMESTEP_S,
  type BikeSpec,
  type SimConfig,
  type TuneSetup,
} from '@/domain';
import { TEST_BIKE } from './testBike';

export function makeConfig(
  patch: (tune: TuneSetup) => TuneSetup = (t) => t,
  bike: BikeSpec = TEST_BIKE,
): SimConfig {
  return {
    bike,
    tune: patch(createStockTune(bike)),
    environment: { airDensity: AIR_DENSITY_SEA_LEVEL, gradePercent: 0 },
    timestepS: DEFAULT_TIMESTEP_S,
  };
}

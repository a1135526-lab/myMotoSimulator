import {
  chassisRun,
  engineSweep,
  type ChassisRunResult,
  type DynoResult,
  type SimConfig,
} from '@/domain';

export interface DynoComputation {
  readonly engine: DynoResult;
  readonly chassis: ChassisRunResult;
}

const CACHE_LIMIT = 24;
const cache = new Map<string, DynoComputation>();

/** Cache key: everything that affects the result (bike + resolved tune + environment). */
const keyOf = (config: SimConfig): string =>
  JSON.stringify([config.bike.id, config.tune, config.environment, config.timestepS]);

/**
 * Engine sweep + full chassis run. A chassis run is ~20 k physics steps
 * (a few ms), so results are memoised for quick toggling between setups.
 */
export function computeDyno(config: SimConfig): DynoComputation {
  const key = keyOf(config);
  const hit = cache.get(key);
  if (hit) return hit;

  const result = { engine: engineSweep(config), chassis: chassisRun(config) };
  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return result;
}

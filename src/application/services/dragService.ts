import { dragRun, type DragRunResult, type SimConfig } from '@/domain';

const CACHE_LIMIT = 64;
const cache = new Map<string, DragRunResult>();

/**
 * Memoised solo pass — garage screens show an estimated ET for every bike
 * card, so the same configuration is asked for many times.
 */
export function computeDragRun(config: SimConfig, distanceM: number): DragRunResult {
  const key = JSON.stringify([config.bike.id, config.tune, config.environment, distanceM]);
  const hit = cache.get(key);
  if (hit) return hit;
  const result = dragRun(config, distanceM);
  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return result;
}

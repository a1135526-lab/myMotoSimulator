import { CITY_GRIP_G, NANZIH } from '@/data';
import { buildCity, type CityMap } from '@/domain';

let cached: CityMap | null = null;
let pending: Promise<CityMap> | null = null;

/**
 * The free-ride city (楠梓). Its map data is a separate download and takes
 * a moment to build, so it loads once, on first use, and is then shared.
 */
export function loadCityMap(): Promise<CityMap> {
  pending ??= NANZIH.load().then((data) => {
    cached = buildCity(data, NANZIH.options);
    return cached;
  });
  return pending;
}

/** The loaded city; only valid after {@link loadCityMap} has resolved. */
export function cityMap(): CityMap {
  if (!cached) throw new Error('City map not loaded yet (await loadCityMap())');
  return cached;
}

export const loadedCityMap = (): CityMap | null => cached;

export const cityEnvironment = () => ({
  airDensity: 1.2,
  gradePercent: 0,
  tractionG: CITY_GRIP_G,
});

export { CITY_GRIP_G };

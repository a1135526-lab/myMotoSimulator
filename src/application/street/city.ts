import { CITY_GRIP_G, HARBOR_CITY } from '@/data';
import { generateCity, type CityMap } from '@/domain';

let cached: CityMap | null = null;

/** The free-ride city, generated once (it is deterministic and fairly big). */
export function cityMap(): CityMap {
  cached ??= generateCity(HARBOR_CITY);
  return cached;
}

export const cityEnvironment = () => ({
  airDensity: 1.2,
  gradePercent: 0,
  tractionG: CITY_GRIP_G,
});

export { CITY_GRIP_G };

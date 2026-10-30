import type { CityData, CityOptions } from '@/domain';
import { parseCityData } from '../schemas/cityData.schema';

/**
 * 高雄市楠梓區 — central Nanzih from OpenStreetMap: 楠梓 station and the old
 * town, 右昌, 後勁, the 德民路 shops, the science park and the rivers.
 * Map data © OpenStreetMap contributors (ODbL); see scripts/osm/README.md.
 */
export interface CitySource {
  readonly id: string;
  readonly name: string;
  readonly options: CityOptions;
  /** The map data is big, so it is only downloaded when the street mode opens. */
  load(): Promise<CityData>;
}

export const NANZIH: CitySource = {
  id: 'nanzih',
  name: '高雄市楠梓區',
  options: {
    seed: 20261031,
    // On 建楠路 in front of 楠梓 railway station.
    spawnNear: { x: 1450, z: -237 },
    spawnRoad: '建楠路',
  },
  load: async () => parseCityData((await import('./nanzih/nanzih.json')).default),
};

/** Dry city tarmac, g. */
export const CITY_GRIP_G = 1.05;

import { useEffect, useState } from 'react';
import type { CityMap } from '@/domain';
import { loadCityMap, loadedCityMap } from '../street/city';

/** The city map, once its data has downloaded and been built (null until then). */
export function useCityMap(): CityMap | null {
  const [map, setMap] = useState(loadedCityMap);
  useEffect(() => {
    if (map) return;
    let live = true;
    void loadCityMap().then((m) => live && setMap(m));
    return () => {
      live = false;
    };
  }, [map]);
  return map;
}

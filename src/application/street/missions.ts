import { NANZIH_MISSIONS, type MissionSpec } from '@/data';
import { findRoute, missionLimitS, type CityMap, type Destination } from '@/domain';

/** A mission placed on the loaded map: where it ends and how long it allows. */
export interface StreetMission extends MissionSpec {
  readonly destination: Destination;
  readonly routeM: number;
  readonly limitS: number;
}

const cache = new WeakMap<CityMap, readonly StreetMission[]>();

/**
 * The missions whose landmark is on this map and reachable from the start,
 * routed once per map. Several landmarks can share a name: the one nearest
 * the start is used.
 */
export function streetMissions(map: CityMap): readonly StreetMission[] {
  const cached = cache.get(map);
  if (cached) return cached;
  const { x, z } = map.spawn;
  const missions = NANZIH_MISSIONS.flatMap((spec): StreetMission[] => {
    const poi = map.pois
      .filter((p) => p.name === spec.place)
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    if (!poi) return [];
    const route = findRoute(map, { x, z }, poi);
    if (!route) return [];
    return [
      {
        ...spec,
        destination: { x: poi.x, z: poi.z, label: spec.place },
        routeM: route.lengthM,
        limitS: missionLimitS(route.lengthM),
      },
    ];
  });
  cache.set(map, missions);
  return missions;
}

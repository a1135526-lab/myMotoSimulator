import {
  placeAt,
  type CityMap,
  type ManeuverKind,
  type PoiKind,
  type RoadClass,
  type RoadEdge,
} from '@/domain';

/** Names, icons and search for the city map and the sat-nav. */

export const POI_LABELS: Readonly<Record<PoiKind, string>> = {
  station: '車站',
  mrt: '捷運站',
  university: '大學',
  school: '學校',
  hospital: '醫院',
  park: '公園',
  temple: '廟宇',
  convenience: '便利商店',
  fuel: '加油站',
  government: '公家機關',
  market: '市場・賣場',
  food: '餐飲',
  landmark: '景點',
};

/** Single glyph per kind for map markers. */
export const POI_ICONS: Readonly<Record<PoiKind, string>> = {
  station: '🚉',
  mrt: 'Ⓜ',
  university: '🎓',
  school: '🏫',
  hospital: '🏥',
  park: '🌳',
  temple: '⛩',
  convenience: '🏪',
  fuel: '⛽',
  government: '🏛',
  market: '🛒',
  food: '🍜',
  landmark: '📍',
};

export const MANEUVER_LABELS: Readonly<Record<ManeuverKind, string>> = {
  straight: '直行',
  'slight-left': '靠左',
  left: '左轉',
  'slight-right': '靠右',
  right: '右轉',
  uturn: '迴轉',
  arrive: '抵達目的地',
};

export function maneuverText(kind: ManeuverKind, road: string | null): string {
  if (kind === 'arrive') return MANEUVER_LABELS.arrive;
  if (kind === 'straight') return road ? `直行進入 ${road}` : '直行';
  return road ? `${MANEUVER_LABELS[kind]} ${road}` : MANEUVER_LABELS[kind];
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(0, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export interface PlaceResult {
  readonly id: string;
  readonly name: string;
  /** What it is: a POI category, or 道路. */
  readonly kindLabel: string;
  readonly icon: string;
  readonly x: number;
  readonly z: number;
}

const ROAD_RANK: Readonly<Record<RoadClass, number>> = {
  primary: 0,
  secondary: 1,
  tertiary: 2,
  link: 3,
  unclassified: 4,
  residential: 5,
  living_street: 6,
};

/** Every named road once, at the middle of its longest stretch. */
export function namedRoads(map: CityMap): PlaceResult[] {
  const longest = new Map<string, RoadEdge>();
  for (const e of map.edges) {
    if (!e.name) continue;
    const prev = longest.get(e.name);
    if (!prev || e.length > prev.length) longest.set(e.name, e);
  }
  return [...longest.values()]
    .sort((a, b) => ROAD_RANK[a.cls] - ROAD_RANK[b.cls] || b.length - a.length)
    .map((e) => {
      const mid = e.points[Math.floor(e.points.length / 2)] ?? e.points[0] ?? { x: 0, z: 0 };
      return {
        id: `road:${e.name}`,
        name: e.name ?? '',
        kindLabel: '道路',
        icon: '🛣',
        x: mid.x,
        z: mid.z,
      };
    });
}

export const poiResult = (map: CityMap, id: number): PlaceResult | null => {
  const p = map.pois[id];
  return p
    ? {
        id: `poi:${p.id}`,
        name: p.name,
        kindLabel: POI_LABELS[p.kind],
        icon: POI_ICONS[p.kind],
        x: p.x,
        z: p.z,
      }
    : null;
};

/**
 * Places whose name contains every word of the query (spaces split words),
 * landmarks before roads, then nearest to `from`.
 */
export function searchPlaces(
  map: CityMap,
  query: string,
  from: { x: number; z: number },
  limit = 12,
): PlaceResult[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const match = (name: string) => words.every((w) => name.includes(w));
  const d = (r: PlaceResult) => Math.hypot(r.x - from.x, r.z - from.z);
  const pois = map.pois
    .filter((p) => match(p.name))
    .map((p) => poiResult(map, p.id) as PlaceResult)
    .sort((a, b) => d(a) - d(b));
  const roads = namedRoads(map).filter((r) => match(r.name));
  return [...pois, ...roads].slice(0, limit);
}

/** Landmarks of one kind, nearest first. */
export function placesOfKind(
  map: CityMap,
  kind: PoiKind,
  from: { x: number; z: number },
  limit = 12,
): PlaceResult[] {
  return map.pois
    .filter((p) => p.kind === kind)
    .sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z))
    .slice(0, limit)
    .map((p) => poiResult(map, p.id) as PlaceResult);
}

/** A name for a spot picked on the map: the road there, else its 里. */
export function pointLabel(map: CityMap, x: number, z: number): string {
  const p = placeAt(map, x, z);
  return p.road ?? (p.village ? `${p.village}附近` : '地圖上的位置');
}

import { describe, expect, it } from 'vitest';
import { buildCity, citySurfaceAt, findRoute, placeAt } from '@/domain';
import { NANZIH, NANZIH_MISSIONS } from '../index';

describe('Nanzih map (OpenStreetMap import)', () => {
  it('validates, credits OpenStreetMap and holds the real network', async () => {
    const data = await NANZIH.load();
    expect(data.attribution).toContain('OpenStreetMap');
    expect(data.nodes.length / 2).toBeGreaterThan(2000);
    expect(data.edges.length).toBeGreaterThan(3000);
    const names = new Set(data.names);
    for (const road of ['德民路', '高楠公路', '楠梓路', '加昌路', '後昌路', '藍昌路']) {
      expect(names.has(road)).toBe(true);
    }
  });

  it('builds a rideable city: start on 建楠路 by 楠梓 station, route across town', async () => {
    const map = buildCity(await NANZIH.load(), NANZIH.options);
    // Only the buildings mapped on OpenStreetMap: none are made up.
    expect(map.buildings.length).toBeGreaterThan(1000);
    expect(map.buildings.every((b) => b.style === 'mapped')).toBe(true);
    expect(citySurfaceAt(map, map.spawn.x, map.spawn.z)).toBe('road');
    expect(placeAt(map, map.spawn.x, map.spawn.z).road).toBe('建楠路');
    const school = map.pois.find((p) => p.name === '高雄市立右昌國民中學');
    if (!school) throw new Error('no 右昌國中');
    const route = findRoute(map, map.spawn, school);
    expect(route?.lengthM).toBeGreaterThan(3000);
    expect(route?.lengthM).toBeLessThan(9000);
    expect(route?.maneuvers.some((m) => m.road !== null)).toBe(true);
  }, 30000);

  it('covers the whole district, with the elevated roads raised over the streets', async () => {
    const map = buildCity(await NANZIH.load(), NANZIH.options);
    // 楠梓區 is about 8.9 km east–west and 6.8 km north–south.
    expect(map.bounds.maxX - map.bounds.minX).toBeGreaterThan(8500);
    expect(map.bounds.maxZ - map.bounds.minZ).toBeGreaterThan(6500);
    expect(map.boundary?.length).toBeGreaterThan(20);
    // West of the old map's edge (援中港, 高雄大學).
    expect(map.edges.some((e) => e.points.some((p) => p.x < -4000))).toBe(true);
    const decks = map.edges.filter((e) => e.heights && Math.max(...e.heights) >= 6);
    expect(decks.length).toBeGreaterThan(5);
    expect(decks.some((e) => e.name === '高楠公路')).toBe(true);
    // The freeway and the rail viaducts, ridden under.
    expect(map.overpasses.length).toBeGreaterThan(10);
  });

  it('every street mission ends at a landmark that is on the map', async () => {
    const data = await NANZIH.load();
    // POIs are [kind, name index, x, z].
    const names = new Set(data.pois.map((p) => data.names[p[1] ?? -1]));
    for (const m of NANZIH_MISSIONS) expect(names, m.place).toContain(m.place);
    expect(new Set(NANZIH_MISSIONS.map((m) => m.id)).size).toBe(NANZIH_MISSIONS.length);
  });
});

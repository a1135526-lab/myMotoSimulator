import { describe, expect, it } from 'vitest';
import { buildCity, citySurfaceAt, findRoute, placeAt } from '@/domain';
import { NANZIH } from '../index';

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
    expect(map.buildings.length).toBeGreaterThan(10000);
    expect(citySurfaceAt(map, map.spawn.x, map.spawn.z)).toBe('road');
    expect(placeAt(map, map.spawn.x, map.spawn.z).road).toBe('建楠路');
    const school = map.pois.find((p) => p.name === '高雄市立右昌國民中學');
    if (!school) throw new Error('no 右昌國中');
    const route = findRoute(map, map.spawn, school);
    expect(route?.lengthM).toBeGreaterThan(3000);
    expect(route?.lengthM).toBeLessThan(9000);
    expect(route?.maneuvers.some((m) => m.road !== null)).toBe(true);
  }, 30000);
});

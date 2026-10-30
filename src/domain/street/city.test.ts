import { describe, expect, it } from 'vitest';
import { TEST_CITY_DATA, TEST_CITY_OPTIONS } from '../../test/fixtures/testCity';
import { buildCity } from './cityBuild';
import {
  citySurfaceAt,
  isSolid,
  nearestOnRoad,
  nearestRoadPose,
  placeAt,
  roadAt,
} from './cityQueries';
import { insidePolygon } from './geometry2d';
import { lanePoint, pointAlong } from './roadNetwork';

const map = buildCity(TEST_CITY_DATA, TEST_CITY_OPTIONS);
const edgeNamed = (n: string) => {
  const e = map.edges.find((x) => x.name === n);
  if (!e) throw new Error(`no ${n}`);
  return e;
};

describe('road network', () => {
  it('builds junctions and edges with widths by class', () => {
    expect(map.nodes).toHaveLength(16);
    expect(map.edges).toHaveLength(24);
    const primary = edgeNamed('南北0路');
    const tertiary = edgeNamed('東西1路');
    expect(primary.widthM).toBeGreaterThan(tertiary.widthM);
    expect(primary.lanesPerDirection).toBe(2);
    expect(edgeNamed('單行巷').oneway).toBe(true);
    // A middle junction has four roads and a clear box; a corner has none.
    expect(map.nodes[5]?.edges).toHaveLength(4);
    expect(map.nodes[5]?.radius).toBeGreaterThan(5);
    expect(map.nodes[0]?.radius).toBe(0);
    expect(map.nodes[5]?.signal).toBe(true);
  });

  it('follows bends: positions along an edge and lanes on the right', () => {
    const bent = map.edges[0];
    if (!bent) throw new Error('no edge');
    expect(bent.points).toHaveLength(3);
    expect(bent.length).toBeGreaterThan(120);
    const mid = pointAlong(bent, bent.cum[1] ?? 0);
    expect(mid.x).toBeCloseTo(60);
    expect(mid.z).toBeCloseTo(-10);
    // Heading east along 東西1路, the right-hand lane is to the south (+z).
    const e = edgeNamed('東西1路');
    const p = lanePoint(e, 60, e.a < e.b, 0);
    expect(p.z).toBeGreaterThan(120);
    expect(p.heading).toBeCloseTo(0);
  });
});

describe('city queries', () => {
  it('knows road, sidewalk, park, water and buildings', () => {
    expect(citySurfaceAt(map, 60, 120)).toBe('road');
    expect(roadAt(map, 60, 121)?.edge.name).toBe('東西1路');
    const tertiary = edgeNamed('東西1路');
    expect(citySurfaceAt(map, 60, 120 + tertiary.widthM / 2 + 1)).toBe('sidewalk');
    expect(citySurfaceAt(map, 180, 180)).toBe('grass');
    expect(citySurfaceAt(map, 300, 300)).toBe('water');
    expect(citySurfaceAt(map, 35, 280)).toBe('building');
    expect(isSolid(citySurfaceAt(map, 9999, 0))).toBe(true);
  });

  it('names the place: road, 里 by boundary or nearest centre, and suburb', () => {
    expect(placeAt(map, 60, 121)).toEqual({ road: '東西1路', village: '甲里', suburb: '測試區' });
    expect(placeAt(map, 330, 61).village).toBe('乙里');
  });

  it('finds the nearest road point, optionally only some roads', () => {
    const hit = nearestOnRoad(map, 60, 100);
    expect(hit?.edge.name).toBe('東西1路');
    expect(hit?.d).toBeCloseTo(20, 0);
    expect(nearestOnRoad(map, 60, 100, 500, (e) => e.cls === 'primary')?.edge.name).toMatch(/南北/);
  });

  it('puts a rider back in the right-hand lane, and one-way streets their own way', () => {
    const pose = nearestRoadPose(map, 70, 100, 0);
    expect(citySurfaceAt(map, pose.x, pose.z)).toBe('road');
    expect(pose.heading).toBeCloseTo(0);
    expect(pose.z).toBeGreaterThan(120);
    const oneWay = nearestRoadPose(map, 355, 60, -Math.PI / 2);
    expect(oneWay.edge.name).toBe('單行巷');
    expect(oneWay.heading).toBeCloseTo(Math.PI / 2); // south, against the asked heading
  });

  it('spawns on a road', () => {
    expect(citySurfaceAt(map, map.spawn.x, map.spawn.z)).toBe('road');
  });
});

describe('generated buildings', () => {
  const generated = map.buildings.filter((b) => b.style !== 'mapped');

  it('fills street fronts, deterministically', () => {
    expect(generated.length).toBeGreaterThan(20);
    const again = buildCity(TEST_CITY_DATA, TEST_CITY_OPTIONS);
    expect(again.buildings.map((b) => b.ring)).toEqual(map.buildings.map((b) => b.ring));
  });

  it('never builds on roads, sidewalks, the park or the pond, or over the mapped building', () => {
    const mapped = map.buildings.find((b) => b.style === 'mapped');
    for (const b of generated) {
      const cx = b.ring.reduce((s, p) => s + p.x, 0) / b.ring.length;
      const cz = b.ring.reduce((s, p) => s + p.z, 0) / b.ring.length;
      for (const p of [...b.ring, { x: cx, z: cz }]) {
        expect(roadAt(map, p.x, p.z)).toBeNull();
        expect(insidePolygon(map.areas[0]?.ring ?? [], p.x, p.z)).toBe(false);
        expect(insidePolygon(map.areas[1]?.ring ?? [], p.x, p.z)).toBe(false);
        expect(insidePolygon(mapped?.ring ?? [], p.x, p.z)).toBe(false);
      }
    }
  });

  it('uses taller shop-houses on the main roads than 透天 rows on lanes', () => {
    const shops = generated.filter((b) => b.style === 'shophouse' || b.style === 'tower');
    const homes = generated.filter((b) => b.style === 'townhouse');
    expect(shops.length).toBeGreaterThan(0);
    expect(homes.length).toBeGreaterThan(0);
    const avg = (l: typeof generated) => l.reduce((s, b) => s + b.heightM, 0) / l.length;
    expect(avg(shops)).toBeGreaterThan(avg(homes));
  });
});

import type { CityData } from '@/domain';

/**
 * A small made-up town for tests: a 4 × 4 grid of junctions 120 m apart.
 * East–west streets (東西0路…) are two-lane tertiary roads; north–south ones
 * (南北0路…) are four-lane primaries, except the east edge, 單行巷, a
 * one-way lane running south. One block is a park, one a pond; there is a
 * mapped 6-storey building, a station and a school.
 */
const STEP = 120;
const names: string[] = [];
const name = (n: string) => {
  const i = names.indexOf(n);
  if (i >= 0) return i;
  names.push(n);
  return names.length - 1;
};
const id = (i: number, j: number) => j * 4 + i;

const nodes: number[] = [];
for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) nodes.push(i * STEP, j * STEP);

const edges: number[][] = [];
for (let j = 0; j < 4; j++) {
  for (let i = 0; i < 3; i++) {
    const bend = i === 0 && j === 0 ? [60, -10] : [];
    edges.push([id(i, j), id(i + 1, j), name(`東西${j}路`), 2, 2, 0, ...bend]);
  }
}
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 3; j++) {
    if (i === 3) edges.push([id(i, j), id(i, j + 1), name('單行巷'), 4, 1, 1]);
    else edges.push([id(i, j), id(i, j + 1), name(`南北${i}路`), 0, 4, 0]);
  }
}

const square = (x0: number, z0: number, x1: number, z1: number) => [x0, z0, x1, z0, x1, z1, x0, z1];

export const TEST_CITY_DATA: CityData = {
  name: '測試鎮',
  attribution: '地圖資料 © OpenStreetMap 貢獻者（測試）',
  bounds: { minX: -100, minZ: -100, maxX: 460, maxZ: 460 },
  names,
  nodes,
  signals: [id(1, 1)],
  edges,
  areas: [
    [3, name('測試公園'), ...square(135, 135, 225, 225)],
    [5, -1, ...square(255, 255, 345, 345)],
  ],
  waterways: [],
  buildings: [[6, ...square(20, 262, 50, 300)]],
  pois: [
    [0, name('測試車站'), 60, 0],
    [3, name('測試國小'), 180, 180],
  ],
  places: [[name('測試區'), 180, 180]],
  villages: [
    [name('甲里'), 60, 180, ...square(-100, -100, 180, 460)],
    [name('乙里'), 320, 180],
  ],
};

export const TEST_CITY_OPTIONS = { seed: 5, spawnNear: { x: 0, z: 200 } };

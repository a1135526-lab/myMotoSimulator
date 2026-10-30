import type { CitySpec } from '@/domain';

/**
 * 港灣市 — an original harbour city for free riding: towers in the middle,
 * shops around them, homes to the north, the port in the south-east, a
 * seafront promenade and an expressway along the shore.
 */
export const HARBOR_CITY: CitySpec = {
  name: '港灣市',
  seed: 20261030,
  blocksX: 10,
  blocksZ: 9,
  blockM: 130,
  streetWidthM: 10,
  avenueWidthM: 18,
  avenueEvery: 3,
  sidewalkM: 4,
  expresswayWidthM: 26,
  promenadeM: 30,
  seaM: 600,
  districtNames: {
    downtown: '市中心',
    commercial: '商業區',
    residential: '住宅區',
    industrial: '港區工業區',
    park: '公園',
    waterfront: '濱海區',
  },
};

/** Dry city tarmac, g. */
export const CITY_GRIP_G = 1.05;

/**
 * Item race: items picked up from boxes on the track. All names and looks
 * are this game's own. Every tuning number lives here.
 */
export const ITEM_IDS = [
  'nitro',
  'triple-boost',
  'oil',
  'tacks',
  'cone',
  'water-balloon',
  'homing',
  'shield',
  'smoke',
  'flash',
  'skateboard',
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export type ItemKind = 'boost' | 'trap' | 'shot' | 'guard' | 'special';

export interface ItemInfo {
  readonly name: string;
  readonly icon: string;
  readonly kind: ItemKind;
}

export const ITEM_INFO: Readonly<Record<ItemId, ItemInfo>> = {
  nitro: { name: '氮氣噴射', icon: '🔥', kind: 'boost' },
  'triple-boost': { name: '三段加速', icon: '⏩', kind: 'boost' },
  oil: { name: '機油', icon: '🛢️', kind: 'trap' },
  tacks: { name: '圖釘帶', icon: '📌', kind: 'trap' },
  cone: { name: '三角錐', icon: '🔺', kind: 'trap' },
  'water-balloon': { name: '水球', icon: '💧', kind: 'shot' },
  homing: { name: '追蹤紙飛機', icon: '✈️', kind: 'shot' },
  shield: { name: '護盾', icon: '🛡️', kind: 'guard' },
  smoke: { name: '煙霧彈', icon: '💨', kind: 'guard' },
  flash: { name: '遠光爆閃', icon: '💡', kind: 'guard' },
  skateboard: { name: '滑板車', icon: '🛹', kind: 'special' },
};

export const isItemId = (v: unknown): v is ItemId =>
  typeof v === 'string' && (ITEM_IDS as readonly string[]).includes(v);

/** Tuning. Times in s, speeds in m/s, distances in m, accelerations in m/s². */
export const ITEM_TUNING = {
  /** The spinner on the HUD before the item can be used. */
  rollS: 0.8,
  boxRespawnS: 3,
  /** Reach of a box: along / across the track. */
  boxReachS: 1.8,
  boxReachD: 1.4,

  nitroS: 2,
  nitroAccel: 5,
  tripleCharges: 3,
  tripleS: 0.8,
  tripleAccel: 3.5,

  /** Hit: speed eases to this share of the speed at the hit over hitS, throttle mostly cut. */
  hitS: 1.5,
  hitKeep: 0.5,
  hitThrottle: 0.3,
  /** After a hit ends, no new hit lands for this long. */
  immuneS: 0.8,

  tacksSlowS: 2,
  tacksKeep: 0.7,
  shieldS: 8,

  skateS: 10,
  skateTopMps: 12.5,
  skatePower: 0.35,

  smokeS: 6,
  smokeLengthM: 40,
  flashRangeM: 70,
  /** cos(40°): the flash and smoke reach riders within this cone. */
  flashConeCos: Math.cos((40 * Math.PI) / 180),

  trapBehindM: 3,
  oilRadiusM: 2.2,
  oilLifeS: 30,
  tacksLifeS: 30,
  tacksLengthM: 1.2,
  coneLifeS: 40,
  /** The rider who dropped a trap can't trip on it straight away. */
  ownTrapGraceS: 1.5,

  waterExtraMps: 25,
  waterLifeS: 4,
  waterRangeM: 250,
  homingMps: 55,
  homingLifeS: 8,
  homingSideMps: 9,
  shotHitS: 1.2,
  shotHitD: 1.1,

  /** No more than this many items a race from one rider (stops message floods). */
  maxUsesPerRace: 40,
} as const;

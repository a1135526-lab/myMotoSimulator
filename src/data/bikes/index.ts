import type { BikeKind, BikeSpec, LicenseClass } from '@/domain';
import { parseBikeSpec } from '../schemas';
import { KAWASAKI_NINJA_400 } from './manual/kawasaki-ninja-400';
import { KAWASAKI_Z900 } from './manual/kawasaki-z900';
import { YAMAHA_MT_09 } from './manual/yamaha-mt-09';
import { YAMAHA_MT_15 } from './manual/yamaha-mt-15';
import { YAMAHA_R15_V4 } from './manual/yamaha-r15-v4';
import { YAMAHA_YZF_R3 } from './manual/yamaha-yzf-r3';
import { KYMCO_KRV_180 } from './scooters/kymco-krv-180';
import { SYM_DRG_158 } from './scooters/sym-drg-158';
import { SYM_JET_SL_125 } from './scooters/sym-jet-sl-125';
import { SYM_MMBCU_158 } from './scooters/sym-mmbcu-158';
import { YAMAHA_CYGNUS_X_125 } from './scooters/yamaha-cygnus-x-125';
import { YAMAHA_FORCE_2_155 } from './scooters/yamaha-force-2-155';
import { YAMAHA_TMAX_560 } from './scooters/yamaha-tmax-560';
import { YAMAHA_XMAX_300 } from './scooters/yamaha-xmax-300';

/**
 * Bike registry. To add a bike: create one data file and append it here —
 * no logic changes required. Every entry is validated at load time.
 * Order within a kind/plate group is display order.
 */
const RAW_BIKES: readonly BikeSpec[] = [
  // 速克達
  SYM_JET_SL_125,
  SYM_DRG_158,
  SYM_MMBCU_158,
  YAMAHA_CYGNUS_X_125,
  YAMAHA_FORCE_2_155,
  KYMCO_KRV_180,
  YAMAHA_XMAX_300,
  YAMAHA_TMAX_560,
  // 打檔車
  YAMAHA_R15_V4,
  YAMAHA_MT_15,
  KAWASAKI_NINJA_400,
  YAMAHA_YZF_R3,
  YAMAHA_MT_09,
  KAWASAKI_Z900,
];

export const BIKES: readonly BikeSpec[] = RAW_BIKES.map(parseBikeSpec);

const ids = new Set<string>();
for (const bike of BIKES) {
  if (ids.has(bike.id)) throw new Error(`Duplicate bike id "${bike.id}"`);
  ids.add(bike.id);
}

export const DEFAULT_BIKE_ID = SYM_JET_SL_125.id;

export const LICENSE_CLASSES: readonly LicenseClass[] = ['white', 'yellow', 'red'];
export const BIKE_KINDS: readonly BikeKind[] = ['scooter', 'manual'];

export function getBike(id: string): BikeSpec {
  const bike = BIKES.find((b) => b.id === id);
  if (!bike) throw new Error(`Unknown bike id "${id}"`);
  return bike;
}

export const bikesOfKind = (kind: BikeKind): BikeSpec[] => BIKES.filter((b) => b.kind === kind);

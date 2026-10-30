import type { BikeKind, BikeSpec, LicenseClass } from '@/domain';
import { parseBikeSpec } from '../schemas';
import { KAWASAKI_NINJA_400 } from './manual/kawasaki-ninja-400';
import { KAWASAKI_Z900 } from './manual/kawasaki-z900';
import { YAMAHA_MT_09 } from './manual/yamaha-mt-09';
import { YAMAHA_MT_15 } from './manual/yamaha-mt-15';
import { YAMAHA_R15_V4 } from './manual/yamaha-r15-v4';
import { YAMAHA_YZF_R3 } from './manual/yamaha-yzf-r3';
import { KYMCO_KRV_180 } from './scooters/kymco-krv-180';
import { KYMCO_RACING_S_150 } from './scooters/kymco-racing-s-150';
import { YAMAHA_NMAX_155 } from './scooters/yamaha-nmax-155';
import { HONDA_PCX_160 } from './scooters/honda-pcx-160';
import { SYM_4MICA_125 } from './scooters/sym-4mica-125';
import { KYMCO_MANY_110 } from './scooters/kymco-many-110';
import { YAMAHA_AUGUR_155 } from './scooters/yamaha-augur-155';
import { VESPA_SPRINT_150 } from './scooters/vespa-sprint-150';
import { HONDA_FORZA_350 } from './scooters/honda-forza-350';
import { KYMCO_AK_550 } from './scooters/kymco-ak-550';
import { SYM_MAXSYM_TL_508 } from './scooters/sym-maxsym-tl-508';
import { SUZUKI_GSX_R150 } from './manual/suzuki-gsx-r150';
import { YAMAHA_XSR155 } from './manual/yamaha-xsr155';
import { KTM_200_DUKE } from './manual/ktm-200-duke';
import { KTM_390_DUKE } from './manual/ktm-390-duke';
import { KAWASAKI_NINJA_ZX_25R } from './manual/kawasaki-ninja-zx-25r';
import { HONDA_CBR500R } from './manual/honda-cbr500r';
import { YAMAHA_MT_03 } from './manual/yamaha-mt-03';
import { BMW_G_310_R } from './manual/bmw-g-310-r';
import { YAMAHA_YZF_R7 } from './manual/yamaha-yzf-r7';
import { HONDA_CBR650R } from './manual/honda-cbr650r';
import { KAWASAKI_NINJA_ZX_6R } from './manual/kawasaki-ninja-zx-6r';
import { BMW_S_1000_RR } from './manual/bmw-s-1000-rr';
import { DUCATI_PANIGALE_V2 } from './manual/ducati-panigale-v2';
import { TRIUMPH_STREET_TRIPLE_765_RS } from './manual/triumph-street-triple-765-rs';
import { SUZUKI_GSX_S1000 } from './manual/suzuki-gsx-s1000';
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
  KYMCO_RACING_S_150,
  YAMAHA_NMAX_155,
  HONDA_PCX_160,
  SYM_4MICA_125,
  KYMCO_MANY_110,
  YAMAHA_AUGUR_155,
  VESPA_SPRINT_150,
  HONDA_FORZA_350,
  KYMCO_AK_550,
  SYM_MAXSYM_TL_508,
  // 打檔車
  YAMAHA_R15_V4,
  YAMAHA_MT_15,
  KAWASAKI_NINJA_400,
  YAMAHA_YZF_R3,
  YAMAHA_MT_09,
  KAWASAKI_Z900,
  SUZUKI_GSX_R150,
  YAMAHA_XSR155,
  KTM_200_DUKE,
  KTM_390_DUKE,
  KAWASAKI_NINJA_ZX_25R,
  HONDA_CBR500R,
  YAMAHA_MT_03,
  BMW_G_310_R,
  YAMAHA_YZF_R7,
  HONDA_CBR650R,
  KAWASAKI_NINJA_ZX_6R,
  BMW_S_1000_RR,
  DUCATI_PANIGALE_V2,
  TRIUMPH_STREET_TRIPLE_765_RS,
  SUZUKI_GSX_S1000,
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

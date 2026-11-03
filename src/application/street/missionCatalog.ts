import { NANZIH_MISSIONS, type MissionSpec } from '@/data';

/** The street missions' titles and places, without loading the city map. */
export const missionCatalog = (): readonly MissionSpec[] => NANZIH_MISSIONS;

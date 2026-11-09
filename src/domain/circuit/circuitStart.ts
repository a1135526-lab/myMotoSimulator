import { isJumpStart, launchIntent } from '../race/reaction';
import type { SimInput } from '../simulation/types';
import type { CircuitRaceState } from './circuitRace';

/**
 * The start: where everyone lines up, and how the player's launch is judged.
 *
 *   staggered → two a row, left and right, rows behind each other (MotoGP).
 *   parallel  → up to four abreast across the track, like a drag start.
 *
 * For the first START_GRACE_S after the lights go out bikes pass through each
 * other, so a pack getting away together never counts as a crash.
 */
export type GridLayout = 'staggered' | 'parallel';

export const LIGHT_INTERVAL_S = 1;
export const LIGHT_COUNT = 5;
/** Held on the spot for this long after the lights go out, for a jump start. */
export const JUMP_START_PENALTY_S = 3;
export const START_GRACE_S = 4;

const GRID_ROW_M = 9;
const GRID_SIDE_M = 2.6;
const PARALLEL_ABREAST = 4;
/** Parallel lanes spread over this share of the half-width. */
const PARALLEL_SPREAD = 0.75;

/** Where grid slot `slot` (0 = pole) is, in track coordinates. */
export function gridSpot(
  slot: number,
  field: number,
  layout: GridLayout,
  halfWidth: number,
): { readonly s: number; readonly d: number } {
  if (layout === 'staggered') {
    const row = Math.floor(slot / 2);
    return { s: -GRID_ROW_M * (row + 1), d: slot % 2 === 0 ? GRID_SIDE_M : -GRID_SIDE_M };
  }
  const row = Math.floor(slot / PARALLEL_ABREAST);
  const inRow = Math.min(PARALLEL_ABREAST, field - row * PARALLEL_ABREAST);
  const lane = slot % PARALLEL_ABREAST;
  const d = inRow <= 1 ? 0 : halfWidth * PARALLEL_SPREAD * (1 - (2 * lane) / (inRow - 1));
  return { s: -GRID_ROW_M * (row + 1), d };
}

/**
 * Grid slot of each rider (index 0 = the player): the player takes
 * `playerSlot` (their place in a friend room), the AI fill the rest in order.
 */
export function gridSlots(riders: number, playerSlot: number): number[] {
  const free = Array.from({ length: Math.max(riders, playerSlot + 1) }, (_, k) => k).filter(
    (k) => k !== playerSlot,
  );
  return Array.from({ length: riders }, (_, i) => (i === 0 ? playerSlot : (free[i - 1] ?? i)));
}

/** Bikes bump into each other: the race is on and the getaway is over. */
export const contactsOn = (race: CircuitRaceState, clockS: number): boolean =>
  (race.phase === 'racing' || race.phase === 'finished') &&
  clockS >= race.lightsOutAtS + START_GRACE_S;

/** The start is judged from the first red light; until then the bike is held for the rider. */
export const judging = (race: CircuitRaceState) =>
  race.phase !== 'grid' && race.clockS >= LIGHT_INTERVAL_S;

/** Note the player's launch once the lights are on; too early earns a stop on the grid. */
export function judgeStart(
  race: CircuitRaceState,
  playerInput: SimInput,
  clockS: number,
): Pick<CircuitRaceState, 'playerLaunchAtS' | 'penaltyUntilS'> {
  const player = race.riders[0];
  const unchanged = { playerLaunchAtS: race.playerLaunchAtS, penaltyUntilS: race.penaltyUntilS };
  if (!judging(race) || race.playerLaunchAtS !== null || !player) return unchanged;
  if (!launchIntent(playerInput, player.sim)) return unchanged;
  return {
    playerLaunchAtS: clockS,
    penaltyUntilS: isJumpStart(clockS, race.lightsOutAtS)
      ? race.lightsOutAtS + JUMP_START_PENALTY_S
      : null,
  };
}

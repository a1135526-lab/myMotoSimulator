import { shiftGear, startEngine } from '../simulation/controls';
import type { SimModel } from '../simulation/model';
import type { SimInput } from '../simulation/types';
import {
  aiControl,
  ASSIST_SKILL,
  brakeAssist,
  CIRCUIT_SKILLS,
  profileAt,
  speedProfile,
  type CircuitSkill,
  type SpeedProfile,
} from './circuitAi';
import {
  contactsOn,
  gridSlots,
  gridSpot,
  judgeStart,
  judging,
  LIGHT_COUNT,
  LIGHT_INTERVAL_S,
  START_GRACE_S,
  type GridLayout,
} from './circuitStart';
import { avoidLine, collideRiders, type ContactBody } from './contacts';
import { findCorners, nextCorner, type Corner } from './corners';
import { wantsDrift } from './drift';
import type { CircuitGeometry } from './geometry';
import type { CornerLimits } from './lateral';
import { EMPTY_TALLY, stepTally, tallyReset, tallyShift, type RideTally } from './rideTally';
import {
  createRider,
  recoverRider,
  stepRider,
  type CircuitRider,
  type RiderContext,
} from './rider';

/**
 * Multi-lap circuit race: the player plus AI riders, MotoGP-style start.
 *   grid     → waiting for the player; everyone held on the brakes.
 *   lights   → five reds come on one per second, then go out after a random hold.
 *              From the first red the player holds their own bike: launching before the
 *              lights go out, or within a human reaction time of it, is a jump
 *              start, served as a stop on the grid (JUMP_START_PENALTY_S).
 *   racing   → until the player completes the laps.
 *   finished → player done; AI keep riding briefly to settle the order.
 */
export type CircuitPhase = 'grid' | 'lights' | 'racing' | 'finished';

const FINISH_GRACE_S = 25;

export interface CircuitSettings {
  readonly laps: number;
  readonly limits: CornerLimits;
  readonly assist: boolean;
  /** Player aid: brake for corners automatically when too fast. */
  readonly brakeAssist: boolean;
  readonly autoShift: boolean;
  /** Manual bikes without auto shift: the clutch slips and bites by itself. */
  readonly autoClutch?: boolean;
}

export interface AiSlot {
  readonly skill: CircuitSkill;
  readonly lineD: number;
  /** Where it lined up across the track: it holds that line through the getaway. */
  readonly gridD: number;
  readonly profile: SpeedProfile;
}

export interface CircuitRaceState {
  readonly phase: CircuitPhase;
  readonly clockS: number;
  readonly lightsOutAtS: number;
  readonly settings: CircuitSettings;
  /** Index 0 is the player. */
  readonly riders: readonly CircuitRider[];
  readonly ai: readonly AiSlot[];
  /** Speed profile behind the player's brake assist (null when off). */
  readonly assistProfile: SpeedProfile | null;
  readonly steer: number;
  /** Player's shaped (ramped) controls, before aids and grip limits. */
  readonly playerInput: SimInput;
  /** Race-clock time the player first asked to go, once the lights started. */
  readonly playerLaunchAtS: number | null;
  /** Player jumped the start: held until this race-clock time. */
  readonly penaltyUntilS: number | null;
  readonly accumulatorS: number;
  /** What the player did this race, for the grades at the flag. */
  readonly tally: RideTally;
  /** A pro's speed round the lap and the corners: the yardstick for corner pace. */
  readonly paceProfile: SpeedProfile;
  readonly corners: readonly Corner[];
}

export interface CircuitSetup {
  readonly settings: CircuitSettings;
  readonly aiSkills: readonly CircuitSkill[];
  /** Random hold after the fifth light, s. */
  readonly holdS: number;
  readonly grid?: GridLayout;
  /** A friend room: your place on the grid and how many line up (the others ride elsewhere). */
  readonly playerSlot?: number;
  readonly field?: number;
}

export function createCircuitRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  setup: CircuitSetup,
): CircuitRaceState {
  const field = Math.max(models.length, setup.field ?? 0);
  const slots = gridSlots(models.length, setup.playerSlot ?? 0);
  const riders = models.map((model, i) => {
    const spot = gridSpot(
      slots[i] ?? i,
      field,
      setup.grid ?? 'staggered',
      setup.settings.limits.halfWidth,
    );
    return createRider(model, geo, spot.s, spot.d);
  });
  const ai = setup.aiSkills.map((skill, i) => ({
    skill,
    lineD: ((i % 3) - 1) * 1.5,
    gridD: riders[i + 1]?.lat.d ?? 0,
    profile: speedProfile(geo, setup.settings.limits.gripG, skill),
  }));
  return {
    phase: 'grid',
    clockS: 0,
    lightsOutAtS: LIGHT_COUNT * LIGHT_INTERVAL_S + setup.holdS,
    settings: setup.settings,
    riders,
    ai,
    assistProfile: setup.settings.brakeAssist
      ? speedProfile(geo, setup.settings.limits.gripG, ASSIST_SKILL)
      : null,
    steer: 0,
    playerInput: { throttle: 0, brake: 0, clutchLever: 0 },
    playerLaunchAtS: null,
    penaltyUntilS: null,
    accumulatorS: 0,
    tally: EMPTY_TALLY,
    paceProfile: speedProfile(geo, setup.settings.limits.gripG, CIRCUIT_SKILLS.pro),
    corners: findCorners(geo),
  };
}

export const startLights = (race: CircuitRaceState): CircuitRaceState =>
  race.phase === 'grid' ? { ...race, phase: 'lights', clockS: 0 } : race;

/** Red lights currently lit (0–5); 0 again once they go out. */
export function litLights(race: CircuitRaceState): number {
  if (race.phase === 'grid' || race.clockS >= race.lightsOutAtS) return 0;
  return Math.min(LIGHT_COUNT, Math.floor(race.clockS / LIGHT_INTERVAL_S));
}

const updatePlayer = (race: CircuitRaceState, fn: (r: CircuitRider) => CircuitRider) => {
  const [player, ...rest] = race.riders;
  return player ? { ...race, riders: [fn(player), ...rest] } : race;
};

/** The player's riding counts toward the grades: racing, before their own flag. */
const tallying = (race: CircuitRaceState) =>
  race.phase === 'racing' && race.riders[0]?.finishedAtS === null;

export const shiftCircuitPlayer = (
  models: readonly SimModel[],
  race: CircuitRaceState,
  dir: 1 | -1,
): CircuitRaceState => {
  const model = models[0];
  const player = race.riders[0];
  if (!model || !player) return race;
  const sim = shiftGear(model, player.sim, dir);
  const shifted = sim.gear !== player.sim.gear && tallying(race);
  return {
    ...updatePlayer(race, (r) => ({ ...r, sim })),
    tally: shifted ? tallyShift(race.tally, model, player.sim, dir) : race.tally,
  };
};

export const startCircuitPlayerEngine = (models: readonly SimModel[], race: CircuitRaceState) => {
  const model = models[0];
  return model ? updatePlayer(race, (r) => ({ ...r, sim: startEngine(model, r.sim) })) : race;
};

const body = (r: CircuitRider): ContactBody => ({
  s: r.lat.s,
  d: r.lat.d,
  psi: r.lat.psi,
  speedMps: r.sim.speedMps,
});

function context(race: CircuitRaceState, geo: CircuitGeometry, model: SimModel): RiderContext {
  return { model, geo, clockS: race.clockS, ...race.settings };
}

/** R key: put the player back on the racing line, stopped. */
export const resetPlayer = (
  geo: CircuitGeometry,
  models: readonly SimModel[],
  race: CircuitRaceState,
) => {
  const model = models[0];
  if (!model) return race;
  const reset = updatePlayer(race, (r) => recoverRider(context(race, geo, model), r));
  return tallying(race) ? { ...reset, tally: tallyReset(race.tally) } : reset;
};

/** Out of time (a friend room's finish window closed): the race ends without your flag. */
export const retireCircuitPlayer = (race: CircuitRaceState): CircuitRaceState =>
  race.phase === 'racing' ? { ...race, phase: 'finished' } : race;

function nextPhase(race: CircuitRaceState): CircuitPhase {
  if (race.phase === 'grid' || race.phase === 'finished') return race.phase;
  const player = race.riders[0];
  if (player?.finishedAtS !== null && player?.finishedAtS !== undefined) {
    const others = race.riders.slice(1);
    const allDone = others.every((r) => r.finishedAtS !== null);
    if (allDone || race.clockS - player.finishedAtS > FINISH_GRACE_S) return 'finished';
  }
  return race.clockS >= race.lightsOutAtS ? 'racing' : 'lights';
}

export function stepCircuitRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  race: CircuitRaceState,
  playerInput: SimInput,
  steer: number,
  /** Bikes known only from the network (a friend room), in track coordinates. */
  others: readonly ContactBody[] = [],
): CircuitRaceState {
  const dt = models[0]?.timestepS ?? 1 / 240;
  const clocked = race.phase !== 'grid';
  const go = race.phase === 'racing' || race.phase === 'finished';
  const clockS = clocked ? race.clockS + dt : race.clockS;
  const timed = { ...race, clockS };

  const riders = race.riders.map((rider, i) => {
    const model = models[i];
    if (!model) return rider;
    const ctx = context(timed, geo, model);
    if (i === 0) {
      // Held on the brake on the grid and while serving a penalty; the player can still rev.
      const held = !judging(race) || (race.penaltyUntilS !== null && clockS < race.penaltyUntilS);
      if (held) return stepRider(ctx, rider, { ...playerInput, brake: 1 }, 0);
      if (!go) return stepRider(ctx, rider, playerInput, 0);
      const input = race.assistProfile
        ? brakeAssist(geo, race.assistProfile, rider.lat.s, rider.sim.speedMps, playerInput)
        : playerInput;
      // Only the rider's own brake starts a slide, not the brake assist.
      return stepRider(ctx, rider, input, steer, wantsDrift(playerInput.brake));
    }
    const slot = race.ai[i - 1];
    if (!slot) return rider;
    const reacted = go && clockS >= race.lightsOutAtS + slot.skill.reactionS;
    // Go round a slower bike on the line instead of riding into it.
    const ahead = [...race.riders.filter((_, k) => k !== i).map(body), ...others];
    const getaway = clockS < race.lightsOutAtS + START_GRACE_S;
    const lineD = getaway
      ? slot.gridD
      : avoidLine(geo, body(rider), slot.lineD, race.settings.limits.halfWidth, ahead);
    const ai = aiControl(
      geo,
      slot.profile,
      rider.lat.s,
      rider.lat.d,
      rider.sim.speedMps,
      lineD,
      reacted,
    );
    return stepRider({ ...ctx, assist: true, autoShift: true }, rider, ai.input, ai.steer);
  });

  // Bikes bump off each other once the race is on and the pack has got away.
  const touched = contactsOn(race, clockS) ? collideRiders(geo, riders, others, clockS) : riders;
  const before = race.riders[0];
  const after = touched[0];
  const tally =
    tallying(race) && before && after
      ? stepTally(race.tally, before, after, paceHere(geo, race, after.lat.s), dt)
      : race.tally;
  const next = { ...timed, riders: touched, tally, ...judgeStart(race, playerInput, clockS) };
  return { ...next, phase: nextPhase(next) };
}

/** A pro's speed at s when it's in a corner, else null. */
function paceHere(geo: CircuitGeometry, race: CircuitRaceState, s: number): number | null {
  const at = nextCorner(geo, race.corners, s);
  return at && at.distanceM === 0 ? profileAt(geo, race.paceProfile, s) : null;
}

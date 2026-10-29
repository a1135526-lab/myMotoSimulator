import { shiftGear, startEngine } from '../simulation/controls';
import { MAX_STEPS_PER_ADVANCE } from '../simulation/fixedStep';
import { shapeInput } from '../simulation/inputShaping';
import type { SimModel } from '../simulation/model';
import type { ControlCommand, SimInput } from '../simulation/types';
import { clamp } from '../units';
import {
  aiControl,
  ASSIST_SKILL,
  brakeAssist,
  speedProfile,
  type CircuitSkill,
  type SpeedProfile,
} from './circuitAi';
import { wantsDrift } from './drift';
import type { CircuitGeometry } from './geometry';
import type { CornerLimits } from './lateral';
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
 *   racing   → until the player completes the laps.
 *   finished → player done; AI keep riding briefly to settle the order.
 */
export type CircuitPhase = 'grid' | 'lights' | 'racing' | 'finished';

export const LIGHT_INTERVAL_S = 1;
export const LIGHT_COUNT = 5;
/** Steer input ramps like the throttle, so a tap is a small correction. */
export const STEER_RATE_PER_S = 6;
export const STEER_RETURN_PER_S = 8;
const GRID_ROW_M = 9;
const GRID_SIDE_M = 2.6;
const FINISH_GRACE_S = 25;

export interface CircuitSettings {
  readonly laps: number;
  readonly limits: CornerLimits;
  readonly assist: boolean;
  /** Player aid: brake for corners automatically when too fast. */
  readonly brakeAssist: boolean;
  readonly autoShift: boolean;
}

export interface AiSlot {
  readonly skill: CircuitSkill;
  readonly lineD: number;
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
  readonly accumulatorS: number;
}

export interface CircuitSetup {
  readonly settings: CircuitSettings;
  readonly aiSkills: readonly CircuitSkill[];
  /** Random hold after the fifth light, s. */
  readonly holdS: number;
}

export function createCircuitRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  setup: CircuitSetup,
): CircuitRaceState {
  const riders = models.map((model, i) => {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? GRID_SIDE_M : -GRID_SIDE_M;
    return createRider(model, geo, -GRID_ROW_M * (row + 1), side);
  });
  const ai = setup.aiSkills.map((skill, i) => ({
    skill,
    lineD: ((i % 3) - 1) * 1.5,
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
    accumulatorS: 0,
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

export const shiftCircuitPlayer = (
  models: readonly SimModel[],
  race: CircuitRaceState,
  dir: 1 | -1,
): CircuitRaceState => {
  const model = models[0];
  return model ? updatePlayer(race, (r) => ({ ...r, sim: shiftGear(model, r.sim, dir) })) : race;
};

export const startCircuitPlayerEngine = (models: readonly SimModel[], race: CircuitRaceState) => {
  const model = models[0];
  return model ? updatePlayer(race, (r) => ({ ...r, sim: startEngine(model, r.sim) })) : race;
};

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
  return model ? updatePlayer(race, (r) => recoverRider(context(race, geo, model), r)) : race;
};

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
      // Held on the brake until the lights go out; the player can still rev.
      if (!go) return stepRider(ctx, rider, { ...playerInput, brake: 1 }, 0);
      const input = race.assistProfile
        ? brakeAssist(geo, race.assistProfile, rider.lat.s, rider.sim.speedMps, playerInput)
        : playerInput;
      // Only the rider's own brake starts a slide, not the brake assist.
      return stepRider(ctx, rider, input, steer, wantsDrift(playerInput.brake, steer));
    }
    const slot = race.ai[i - 1];
    if (!slot) return rider;
    const reacted = go && clockS >= race.lightsOutAtS + slot.skill.reactionS;
    const ai = aiControl(
      geo,
      slot.profile,
      rider.lat.s,
      rider.lat.d,
      rider.sim.speedMps,
      slot.lineD,
      reacted,
    );
    return stepRider({ ...ctx, assist: true, autoShift: true }, rider, ai.input, ai.steer);
  });

  const next = { ...timed, riders };
  return { ...next, phase: nextPhase(next) };
}

const approach = (value: number, target: number, dt: number) => {
  const rate = Math.abs(target) > Math.abs(value) ? STEER_RATE_PER_S : STEER_RETURN_PER_S;
  return value + clamp(target - value, -rate * dt, rate * dt);
};

export interface CircuitCommand extends ControlCommand {
  readonly steerLeftPressed: boolean;
  readonly steerRightPressed: boolean;
}

export function advanceCircuitRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  race: CircuitRaceState,
  command: CircuitCommand,
  elapsedS: number,
): CircuitRaceState {
  const dt = models[0]?.timestepS ?? 1 / 240;
  let acc = Math.min(race.accumulatorS + Math.max(0, elapsedS), dt * MAX_STEPS_PER_ADVANCE);
  let current = race;
  const wanted = (command.steerLeftPressed ? 1 : 0) - (command.steerRightPressed ? 1 : 0);
  while (acc >= dt) {
    const input = shapeInput(current.playerInput, command, dt);
    const steer = approach(current.steer, wanted, dt);
    current = { ...stepCircuitRace(geo, models, current, input, steer), steer, playerInput: input };
    acc -= dt;
  }
  return { ...current, accumulatorS: acc };
}

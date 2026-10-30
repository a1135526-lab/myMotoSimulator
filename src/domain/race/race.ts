import { prepareLaunch } from '../dyno/autoRider';
import { withAutoClutch } from '../simulation/autoClutch';
import { shiftGear, startEngine } from '../simulation/controls';
import { MAX_STEPS_PER_ADVANCE } from '../simulation/fixedStep';
import { shapeInput } from '../simulation/inputShaping';
import type { SimModel } from '../simulation/model';
import { createInitialState, step } from '../simulation/simulator';
import type { ControlCommand, SimInput } from '../simulation/types';
import { opponentInput, type SkillProfile } from './opponent';
import { createRacer, markLaunch, updateMarks, type RacerState } from './racer';
import { treeTiming, type TreeMode, type TreeTiming } from './tree';

/**
 * Two-bike drag race.
 *
 *   staged    → both bikes on the line; the player is held on the brake so
 *               they can rev / pick a gear without rolling.
 *   countdown → tree runs. The bike is held until the first amber; from then on
 *               the rider holds it, and launching before green — or quicker
 *               after it than a human can react — is a false start.
 *   racing    → green is on.
 *   finished  → both crossed (or the trailing bike timed out).
 *
 * Both bikes share one race clock (0 = countdown start) and step together at
 * the fixed physics timestep.
 */
export type RacePhase = 'staged' | 'countdown' | 'racing' | 'finished';

export interface RaceModels {
  readonly player: SimModel;
  readonly opponent: SimModel;
}

export interface RaceSettings {
  readonly distanceM: number;
  readonly treeMode: TreeMode;
  /** Manual bikes: the clutch slips and bites by itself (see autoClutch.ts). */
  readonly autoClutch?: boolean;
}

export interface RaceState {
  readonly phase: RacePhase;
  readonly clockS: number;
  readonly settings: RaceSettings;
  readonly tree: TreeTiming;
  readonly player: RacerState;
  readonly opponent: RacerState;
  readonly opponentSkill: SkillProfile;
  /** Opponent's reaction time for this race (sampled by the caller). */
  readonly opponentReactionS: number;
  readonly opponentPeakTorqueRpm: number;
  readonly accumulatorS: number;
}

export const MIN_RACE_DISTANCE_M = 50;
export const MAX_RACE_DISTANCE_M = 3000;
/** Trailing bike gets this long after the leader finishes before it's a DNF. */
export const FINISH_GRACE_S = 15;
export const RACE_TIMEOUT_S = 180;
/** Once over the line, riders roll off and brake gently. */
const COAST_DOWN: SimInput = { throttle: 0, brake: 0.4, clutchLever: 1 };
const HOLD_ON_LINE: Partial<SimInput> = { brake: 1 };

export interface RaceSetup {
  readonly settings: RaceSettings;
  readonly opponentSkill: SkillProfile;
  readonly opponentReactionS: number;
  readonly stageDelayS: number;
}

export function createRace(models: RaceModels, setup: RaceSetup): RaceState {
  const opponentSim = prepareLaunch(models.opponent, createInitialState(models.opponent));
  return {
    phase: 'staged',
    clockS: 0,
    settings: setup.settings,
    tree: treeTiming(setup.settings.treeMode, setup.stageDelayS),
    player: createRacer(createInitialState(models.player)),
    opponent: createRacer(opponentSim, { throttle: 0, brake: 0, clutchLever: 1 }),
    opponentSkill: setup.opponentSkill,
    opponentReactionS: setup.opponentReactionS,
    opponentPeakTorqueRpm: models.opponent.config.bike.engine.peakTorque.rpm,
    accumulatorS: 0,
  };
}

export const startCountdown = (race: RaceState): RaceState =>
  race.phase === 'staged' ? { ...race, phase: 'countdown', clockS: 0 } : race;

export function shiftPlayer(models: RaceModels, race: RaceState, direction: 1 | -1): RaceState {
  const sim = shiftGear(models.player, race.player.sim, direction);
  return sim === race.player.sim ? race : { ...race, player: { ...race.player, sim } };
}

export function startPlayerEngine(models: RaceModels, race: RaceState): RaceState {
  const sim = startEngine(models.player, race.player.sim);
  return sim === race.player.sim ? race : { ...race, player: { ...race.player, sim } };
}

function nextPhase(race: RaceState, clockS: number): RacePhase {
  if (race.phase === 'staged' || race.phase === 'finished') return race.phase;
  const { player, opponent } = race;
  const finishes = [player.finishedAtS, opponent.finishedAtS].filter(
    (t): t is number => t !== null,
  );
  if (finishes.length === 2 || clockS >= RACE_TIMEOUT_S) return 'finished';
  if (finishes.length === 1 && clockS - (finishes[0] ?? clockS) >= FINISH_GRACE_S)
    return 'finished';
  return clockS >= race.tree.greenAtS ? 'racing' : 'countdown';
}

/** One fixed physics step for both bikes. `playerInput` is already shaped. */
export function stepRace(models: RaceModels, race: RaceState, playerInput: SimInput): RaceState {
  const dt = models.player.timestepS;
  const clocked = race.phase !== 'staged';
  const clock0 = race.clockS;
  const clock1 = clocked ? clock0 + dt : clock0;
  const { distanceM } = race.settings;
  const green = race.tree.greenAtS;

  // Player
  const judging = clocked && clock1 >= race.tree.ambersAtS[0];
  const held = judging ? playerInput : { ...playerInput, ...HOLD_ON_LINE };
  const pIn =
    race.player.finishedAtS !== null
      ? COAST_DOWN
      : race.settings.autoClutch
        ? withAutoClutch(models.player, race.player.sim, held)
        : held;
  const pNext = step(models.player, race.player.sim, pIn);
  // Judge the rider's own hands, not what the auto clutch did with them.
  const pLaunched = judging ? markLaunch(race.player, playerInput, clock1, green) : race.player;
  const player = clocked
    ? updateMarks(pLaunched, race.player.sim, pNext, clock0, clock1, green, distanceM)
    : { ...race.player, sim: pNext };

  // Opponent
  const ai = opponentInput(models.opponent, race.opponent.sim, {
    clockS: clocked ? clock0 : -1,
    goAtS: green + race.opponentReactionS,
    skill: race.opponentSkill,
    peakTorqueRpm: race.opponentPeakTorqueRpm,
  });
  const oIn = race.opponent.finishedAtS !== null ? COAST_DOWN : ai.input;
  const oPrev = ai.shift
    ? shiftGear(models.opponent, race.opponent.sim, ai.shift)
    : race.opponent.sim;
  const oNext = step(models.opponent, oPrev, oIn);
  const oLaunched = clocked
    ? markLaunch({ ...race.opponent, sim: oPrev }, oIn, clock1, green)
    : race.opponent;
  const opponent = clocked
    ? updateMarks({ ...oLaunched, input: oIn }, oPrev, oNext, clock0, clock1, green, distanceM)
    : { ...race.opponent, sim: oNext, input: oIn };

  const next = { ...race, clockS: clock1, player: { ...player, input: playerInput }, opponent };
  return { ...next, phase: nextPhase(next, clock1) };
}

/** Fixed-timestep accumulator over {@link stepRace}, shaping the player's controls per step. */
export function advanceRace(
  models: RaceModels,
  race: RaceState,
  command: ControlCommand,
  elapsedS: number,
): RaceState {
  const dt = models.player.timestepS;
  let accumulator = Math.min(race.accumulatorS + Math.max(0, elapsedS), dt * MAX_STEPS_PER_ADVANCE);
  let current = race;
  while (accumulator >= dt) {
    current = stepRace(models, current, shapeInput(current.player.input, command, dt));
    accumulator -= dt;
  }
  return { ...current, accumulatorS: accumulator };
}

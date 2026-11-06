import { MAX_STEPS_PER_ADVANCE } from '../simulation/fixedStep';
import { shapeInput } from '../simulation/inputShaping';
import type { SimModel } from '../simulation/model';
import type { ControlCommand } from '../simulation/types';
import { clamp } from '../units';
import { stepCircuitRace, type CircuitRaceState } from './circuitRace';
import { toTrack, type ContactBody } from './contacts';
import type { CircuitGeometry } from './geometry';

/** Steer input ramps like the throttle, so a tap is a small correction. */
export const STEER_RATE_PER_S = 6;
export const STEER_RETURN_PER_S = 8;

/** Another player's bike as last heard from the network, in world coordinates. */
export interface RemoteBike {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly speedMps: number;
}

const approach = (value: number, target: number, dt: number) => {
  const rate = Math.abs(target) > Math.abs(value) ? STEER_RATE_PER_S : STEER_RETURN_PER_S;
  return value + clamp(target - value, -rate * dt, rate * dt);
};

export interface CircuitCommand extends ControlCommand {
  readonly steerLeftPressed: boolean;
  readonly steerRightPressed: boolean;
  /** Analogue steering, −1…1 (+ = left), e.g. from tilting the phone. */
  readonly steerAxis?: number;
}

/** Steering wanted, −1…1 (+ = left): the buttons win over the analogue axis. */
export function steerTarget(command: CircuitCommand): number {
  const buttons = (command.steerLeftPressed ? 1 : 0) - (command.steerRightPressed ? 1 : 0);
  return buttons !== 0 ? buttons : clamp(command.steerAxis ?? 0, -1, 1);
}

/** Remote bikes placed on the track near the player, to bump into. */
function remoteBodies(
  geo: CircuitGeometry,
  race: CircuitRaceState,
  remotes: readonly RemoteBike[],
): ContactBody[] {
  const nearS = race.riders[0]?.lat.s ?? 0;
  return remotes.map((b) => {
    const t = toTrack(geo, b.x, b.z, nearS);
    // ψ > 0 points left of the track, and left turns lower the heading.
    return { s: t.s, d: t.d, psi: t.heading - b.heading, speedMps: b.speedMps };
  });
}

export function advanceCircuitRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  race: CircuitRaceState,
  command: CircuitCommand,
  elapsedS: number,
  remotes: readonly RemoteBike[] = [],
): CircuitRaceState {
  const dt = models[0]?.timestepS ?? 1 / 240;
  let acc = Math.min(race.accumulatorS + Math.max(0, elapsedS), dt * MAX_STEPS_PER_ADVANCE);
  let current = race;
  const wanted = steerTarget(command);
  const others = remoteBodies(geo, race, remotes);
  while (acc >= dt) {
    const input = shapeInput(current.playerInput, command, dt);
    const steer = approach(current.steer, wanted, dt);
    current = {
      ...stepCircuitRace(geo, models, current, input, steer, others),
      steer,
      playerInput: input,
    };
    acc -= dt;
  }
  return { ...current, accumulatorS: acc };
}

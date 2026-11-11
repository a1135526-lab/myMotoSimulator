import {
  approach,
  remoteBodies,
  steerTarget,
  type CircuitCommand,
  type RemoteBike,
} from '../circuit/circuitAdvance';
import type { CircuitGeometry } from '../circuit/geometry';
import { MAX_STEPS_PER_ADVANCE } from '../simulation/fixedStep';
import { shapeInput } from '../simulation/inputShaping';
import type { SimModel } from '../simulation/model';
import type { ItemRaceState, RemoteBody } from './itemRace';
import { stepItemRace } from './itemStep';

/** Other players' bikes on the track, with who they are and how far they've gone. */
export function remoteItemBodies(
  geo: CircuitGeometry,
  state: ItemRaceState,
  remotes: readonly RemoteBike[],
): RemoteBody[] {
  const bodies = remoteBodies(geo, state.race, remotes);
  return remotes.flatMap((b, i) => {
    const body = bodies[i];
    return body ? [{ ...body, id: b.id ?? `remote-${i}`, progressM: b.progressM ?? 0 }] : [];
  });
}

/** Like advanceCircuitRace, one fixed step at a time, with the items in play. */
export function advanceItemRace(
  geo: CircuitGeometry,
  models: readonly SimModel[],
  state: ItemRaceState,
  command: CircuitCommand,
  elapsedS: number,
  remotes: readonly RemoteBike[] = [],
): ItemRaceState {
  const dt = models[0]?.timestepS ?? 1 / 240;
  let acc = Math.min(state.race.accumulatorS + Math.max(0, elapsedS), dt * MAX_STEPS_PER_ADVANCE);
  let current = state;
  const wanted = steerTarget(command);
  const remote = remoteItemBodies(geo, state, remotes);
  while (acc >= dt) {
    const input = shapeInput(current.race.playerInput, command, dt);
    const steer = approach(current.race.steer, wanted, dt);
    const next = stepItemRace(geo, models, current, input, steer, remote);
    current = { ...next, race: { ...next.race, steer, playerInput: input } };
    acc -= dt;
  }
  return { ...current, race: { ...current.race, accumulatorS: acc } };
}

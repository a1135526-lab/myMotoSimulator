import { wantsDrift } from '../circuit/drift';
import type { CircuitCommand } from '../circuit/circuitRace';
import { shiftGear, startEngine } from '../simulation/controls';
import { MAX_STEPS_PER_ADVANCE } from '../simulation/fixedStep';
import { shapeInput } from '../simulation/inputShaping';
import type { SimModel } from '../simulation/model';
import type { SimInput } from '../simulation/types';
import { clamp } from '../units';
import type { CityMap } from './city';
import {
  crashRider,
  createFreeRider,
  respawnRider,
  stepFreeRider,
  type FreeRideContext,
  type FreeRider,
} from './freeRide';
import { startNavigation, updateNavigation, type Destination, type NavState } from './navigation';
import { createTraffic, hitCar, stepTraffic, type TrafficState } from './traffic';

/**
 * A free ride: the player and the city's traffic, stepped together at the
 * physics timestep (traffic every few steps — it only needs to look smooth).
 */
export interface StreetSettings {
  /** Dry tarmac grip, g. */
  readonly gripG: number;
  readonly autoShift: boolean;
  readonly autoClutch: boolean;
  readonly trafficCount: number;
  readonly seed: number;
}

export interface StreetState {
  readonly clockS: number;
  readonly steps: number;
  readonly settings: StreetSettings;
  readonly rider: FreeRider;
  readonly traffic: TrafficState;
  readonly steer: number;
  readonly playerInput: SimInput;
  readonly accumulatorS: number;
  /** Sat-nav, when a destination is set. */
  readonly nav: NavState | null;
}

const TRAFFIC_EVERY = 4;
/** Re-check position on the route this often (steps). */
const NAV_EVERY = 12;
/** A car moving faster than this, or a rider faster than BUMP, means a crash. */
const CAR_HIT_MPS = 3;
const RIDER_BUMP_MPS = 1.5;
const STEER_RATE_PER_S = 6;
const STEER_RETURN_PER_S = 8;

export function createStreetRide(
  map: CityMap,
  model: SimModel,
  settings: StreetSettings,
): StreetState {
  const rider = createFreeRider(model, map);
  return {
    clockS: 0,
    steps: 0,
    settings,
    rider,
    traffic: createTraffic(map, settings.trafficCount, settings.seed, rider),
    steer: 0,
    playerInput: { throttle: 0, brake: 0, clutchLever: 0 },
    accumulatorS: 0,
    nav: null,
  };
}

const context = (map: CityMap, model: SimModel, s: StreetState): FreeRideContext => ({
  model,
  map,
  gripG: s.settings.gripG,
  clockS: s.clockS,
  autoShift: s.settings.autoShift,
  autoClutch: s.settings.autoClutch,
});

export function stepStreet(
  map: CityMap,
  model: SimModel,
  state: StreetState,
  input: SimInput,
  steer: number,
): StreetState {
  const dt = model.timestepS;
  const timed = { ...state, clockS: state.clockS + dt, steps: state.steps + 1 };
  const ctx = context(map, model, timed);
  let rider: FreeRider = stepFreeRider(ctx, state.rider, input, steer, wantsDrift(input.brake));

  const traffic =
    timed.steps % TRAFFIC_EVERY === 0
      ? stepTraffic(
          map,
          state.traffic,
          dt * TRAFFIC_EVERY,
          rider.crashedUntilS === null ? rider : null,
          timed.steps,
          rider,
        )
      : state.traffic;
  const nav =
    state.nav && timed.steps % NAV_EVERY === 0
      ? updateNavigation(map, state.nav, rider.x, rider.z)
      : state.nav;

  if (rider.crashedUntilS === null) {
    const car = hitCar(traffic, rider.x, rider.z);
    if (car && (car.speedMps > CAR_HIT_MPS || rider.sim.speedMps > RIDER_BUMP_MPS)) {
      rider = crashRider(ctx, rider);
    }
  }
  return { ...timed, rider, traffic, nav };
}

const approach = (value: number, target: number, dt: number) => {
  const rate = Math.abs(target) > Math.abs(value) ? STEER_RATE_PER_S : STEER_RETURN_PER_S;
  return value + clamp(target - value, -rate * dt, rate * dt);
};

export function advanceStreet(
  map: CityMap,
  model: SimModel,
  state: StreetState,
  command: CircuitCommand,
  elapsedS: number,
): StreetState {
  const dt = model.timestepS;
  let acc = Math.min(state.accumulatorS + Math.max(0, elapsedS), dt * MAX_STEPS_PER_ADVANCE);
  let current = state;
  const wanted = (command.steerLeftPressed ? 1 : 0) - (command.steerRightPressed ? 1 : 0);
  while (acc >= dt) {
    const input = shapeInput(current.playerInput, command, dt);
    const steer = approach(current.steer, wanted, dt);
    current = { ...stepStreet(map, model, current, input, steer), steer, playerInput: input };
    acc -= dt;
  }
  return { ...current, accumulatorS: acc };
}

const withRider = (state: StreetState, rider: FreeRider) =>
  rider === state.rider ? state : { ...state, rider };

export const shiftStreetRider = (model: SimModel, state: StreetState, dir: 1 | -1) =>
  withRider(state, { ...state.rider, sim: shiftGear(model, state.rider.sim, dir) });

export const startStreetEngine = (model: SimModel, state: StreetState) =>
  withRider(state, { ...state.rider, sim: startEngine(model, state.rider.sim) });

/** R: back on the nearest road. */
export const resetStreetRider = (map: CityMap, model: SimModel, state: StreetState) =>
  withRider(state, respawnRider(context(map, model, state), state.rider));

/** Plan a route from where the rider is; null nav if there's no way there. */
export function setStreetDestination(map: CityMap, state: StreetState, destination: Destination) {
  const { x, z } = state.rider;
  return { ...state, nav: startNavigation(map, { x, z }, destination) };
}

export const clearStreetDestination = (state: StreetState): StreetState =>
  state.nav ? { ...state, nav: null } : state;

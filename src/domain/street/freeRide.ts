import { autoGearbox } from '../circuit/autoGearbox';
import { driftBrakeShare, driftCurvature, stepDrift } from '../circuit/drift';
import {
  longitudinalGripShare,
  maxLean,
  pathCurvature,
  runoffCurvature,
  stepLean,
} from '../circuit/lateral';
import { withAutoClutch } from '../simulation/autoClutch';
import { shiftGear } from '../simulation/controls';
import type { SimModel } from '../simulation/model';
import { createInitialState, step } from '../simulation/simulator';
import type { SimInput, SimState } from '../simulation/types';
import { mpsToKmh } from '../units';
import type { CityMap, CitySurface } from './city';
import { citySurfaceAt, isSolid, nearestRoadPose } from './cityQueries';

/**
 * One rider loose in the city, in world coordinates. The engine and gearbox
 * are the full simulator; turning is by lean, κ = g·tanφ / v², as on the
 * circuit (with no steering assist), plus walking-pace steering and the brake
 * slide. Heading h: forward = (cos h, sin h); a left turn lowers h.
 *
 * Reverse is the rider paddling the bike backwards with their feet: only from
 * a standstill with the throttle shut, at walking pace, outside the engine sim.
 */

/** Grip by surface, as a share of the tarmac's. */
const SURFACE_GRIP: Readonly<Record<CitySurface, number>> = {
  road: 1,
  sidewalk: 0.85,
  grass: 0.5,
  building: 1,
  water: 1,
};
const GRASS_ROLLING_COEFF = 0.09;
/** Grip never drops fully to zero, so a leaned bike can still creep forward. */
const MIN_GRIP_SHARE = 0.12;
/** Time on the ground after a crash before the bike is put back on a road. */
export const STREET_CRASH_S = 1.5;
/** Below this, hitting a wall is a bump, not a crash. */
const BUMP_MPS = 2;
/** Body radius for hitting walls, m. */
export const RIDER_RADIUS_M = 0.6;
/** Paddling backwards tops out at a slow walk, m/s (≈ 4 km/h). */
export const REVERSE_MAX_MPS = 1.1;
const REVERSE_ACCEL_MPS2 = 1.2;
/** Feet down when the key is let go; harder with the brake on. */
const REVERSE_STOP_MPS2 = 3;
const REVERSE_BRAKE_MPS2 = 8;
/** Reverse only engages from (nearly) stopped, with the throttle shut. */
const REVERSE_ENGAGE_MPS = 0.3;
const REVERSE_MAX_THROTTLE = 0.05;

export interface FreeRider {
  readonly sim: SimState;
  readonly input: SimInput;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly lean: number;
  readonly drift: number;
  /** Backwards speed while paddling in reverse, m/s (≥ 0). */
  readonly reverseMps: number;
  readonly surface: CitySurface;
  readonly crashedUntilS: number | null;
  readonly distanceM: number;
  readonly topSpeedKmh: number;
}

export interface FreeRideContext {
  readonly model: SimModel;
  readonly map: CityMap;
  /** Dry tarmac grip, g. */
  readonly gripG: number;
  readonly clockS: number;
  readonly autoShift: boolean;
  readonly autoClutch: boolean;
}

export function createFreeRider(model: SimModel, map: CityMap): FreeRider {
  const { x, z, heading } = map.spawn;
  return {
    sim: createInitialState(model),
    input: { throttle: 0, brake: 0, clutchLever: 0 },
    x,
    z,
    heading,
    lean: 0,
    drift: 0,
    reverseMps: 0,
    surface: 'road',
    crashedUntilS: null,
    distanceM: 0,
    topSpeedKmh: 0,
  };
}

/** Back on the nearest road, stopped, engine running, in a low gear. */
export function respawnRider(ctx: FreeRideContext, rider: FreeRider): FreeRider {
  const pose = nearestRoadPose(ctx.map, rider.x, rider.z, rider.heading);
  const base = createInitialState(ctx.model);
  return {
    ...rider,
    sim: {
      ...rider.sim,
      speedMps: 0,
      accelerationMps2: 0,
      engineRpm: base.engineRpm,
      engineRunning: true,
      clutchState: 'disengaged',
      gear: rider.sim.gear === null ? null : Math.min(1, rider.sim.gear),
    },
    x: pose.x,
    z: pose.z,
    heading: pose.heading,
    lean: 0,
    drift: 0,
    reverseMps: 0,
    surface: 'road',
    crashedUntilS: null,
  };
}

export function crashRider(ctx: FreeRideContext, rider: FreeRider): FreeRider {
  return {
    ...rider,
    sim: { ...rider.sim, speedMps: 0 },
    lean: 0,
    drift: 0,
    reverseMps: 0,
    crashedUntilS: ctx.clockS + STREET_CRASH_S,
  };
}

/** Hitting something solid: anywhere on the rider's body circle. */
function blocked(map: CityMap, x: number, z: number): boolean {
  const r = RIDER_RADIUS_M;
  return [
    [x, z],
    [x + r, z],
    [x - r, z],
    [x, z + r],
    [x, z - r],
  ].some(([px, pz]) => isSolid(citySurfaceAt(map, px ?? x, pz ?? z)));
}

/** Backwards speed after one step of paddling (or putting the feet down). */
function stepReverse(rider: FreeRider, input: SimInput, wanted: boolean, dt: number): number {
  const engage =
    wanted && rider.sim.speedMps < REVERSE_ENGAGE_MPS && input.throttle <= REVERSE_MAX_THROTTLE;
  if (engage) return Math.min(REVERSE_MAX_MPS, rider.reverseMps + REVERSE_ACCEL_MPS2 * dt);
  const stop = REVERSE_STOP_MPS2 + REVERSE_BRAKE_MPS2 * input.brake;
  return Math.max(0, rider.reverseMps - stop * dt);
}

function modelOn(ctx: FreeRideContext, surface: CitySurface, grip: number, lean: number) {
  const body = ctx.model.body;
  return {
    ...ctx.model,
    body: {
      ...body,
      tractionG: grip * Math.max(MIN_GRIP_SHARE, longitudinalGripShare(lean, grip)),
      rollingResistanceCoeff:
        surface === 'grass' ? GRASS_ROLLING_COEFF : body.rollingResistanceCoeff,
    },
  };
}

export function stepFreeRider(
  ctx: FreeRideContext,
  rider: FreeRider,
  input: SimInput,
  /** −1…1, + = left. */
  steer: number,
  /** Hard on the brake: start (with steer) or hold a rear slide. */
  driftWanted: boolean,
  /** Paddling backwards (only takes effect from a standstill). */
  reverseWanted = false,
): FreeRider {
  const dt = ctx.model.timestepS;
  if (rider.crashedUntilS !== null) {
    return ctx.clockS >= rider.crashedUntilS ? respawnRider(ctx, rider) : rider;
  }

  let sim = rider.sim;
  let applied = input;
  if (ctx.autoShift) {
    const box = autoGearbox(ctx.model, sim, input.throttle, input.brake);
    if (box.shift !== 0) sim = shiftGear(ctx.model, sim, box.shift);
    applied = { ...input, clutchLever: box.clutchLever };
  } else if (ctx.autoClutch) {
    applied = withAutoClutch(ctx.model, sim, input);
  }

  const grip = ctx.gripG * SURFACE_GRIP[rider.surface];
  const drift =
    rider.surface === 'grass' ? 0 : stepDrift(rider.drift, driftWanted, steer, sim.speedMps, dt);
  const brakeShare = Math.max(
    MIN_GRIP_SHARE,
    driftBrakeShare(drift, longitudinalGripShare(rider.lean, grip)),
  );
  applied = { ...applied, brake: applied.brake * brakeShare * Math.min(1, grip) };
  sim = step(modelOn(ctx, rider.surface, grip, rider.lean), sim, applied);

  const forward = sim.speedMps;
  const reverseMps = stepReverse(rider, input, reverseWanted, dt);
  // Signed: negative while rolling backwards, which also swings the heading
  // the other way for the same bar angle, as a real bike does.
  const v = forward - reverseMps;
  const lean = stepLean(rider.lean, Math.max(-1, Math.min(1, steer)) * maxLean(grip), dt);
  const kappa =
    pathCurvature(lean, Math.abs(v), steer) +
    driftCurvature(drift, forward, steer) +
    (rider.surface === 'grass' ? runoffCurvature(steer, forward) : 0);
  const heading = rider.heading - v * kappa * dt;
  const x = rider.x + Math.cos(heading) * v * dt;
  const z = rider.z + Math.sin(heading) * v * dt;

  const moved: FreeRider = {
    ...rider,
    sim,
    input: applied,
    heading: Math.atan2(Math.sin(heading), Math.cos(heading)),
    lean,
    drift,
    reverseMps,
    distanceM: rider.distanceM + Math.abs(v) * dt,
    topSpeedKmh: Math.max(rider.topSpeedKmh, mpsToKmh(forward)),
  };
  if (blocked(ctx.map, x, z)) {
    // Walking pace into a wall just stops you; any faster and you're down.
    return Math.abs(v) > BUMP_MPS
      ? crashRider(ctx, moved)
      : { ...moved, sim: { ...sim, speedMps: 0 }, reverseMps: 0 };
  }
  return { ...moved, x, z, surface: citySurfaceAt(ctx.map, x, z) };
}

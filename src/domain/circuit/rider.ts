import { shiftGear } from '../simulation/controls';
import type { SimModel } from '../simulation/model';
import { createInitialState, step } from '../simulation/simulator';
import type { SimInput, SimState } from '../simulation/types';
import { autoGearbox } from './autoGearbox';
import { driftCurvature, stepDrift } from './drift';
import { wrapS, type CircuitGeometry } from './geometry';
import {
  assistCurvature,
  gripOn,
  leanCurvatureLimit,
  integrate,
  longitudinalGripShare,
  pathCurvature,
  RUNOFF_ROLLING_COEFF,
  STRAIGHT_AHEAD,
  stepLean,
  surfaceAt,
  targetLean,
  type CornerLimits,
  type LateralState,
  type Surface,
} from './lateral';

/** Time on the ground after hitting the barrier before the bike is put back on track. */
export const CRASH_RECOVERY_S = 2.5;
/** Grip never drops fully to zero, so a leaned bike can still creep forward. */
const MIN_GRIP_SHARE = 0.12;

export interface CircuitRider {
  readonly sim: SimState;
  /** Shaped longitudinal input actually applied. */
  readonly input: SimInput;
  readonly lat: LateralState;
  readonly surface: Surface;
  /** Line crossings so far (the first one starts lap 1). */
  readonly crossings: number;
  readonly lapStartedAtS: number | null;
  readonly lapTimesS: readonly number[];
  readonly finishedAtS: number | null;
  /** Total distance along the track since the start, for race order. */
  readonly progressM: number;
  readonly crashedUntilS: number | null;
  /** Distance from the grid slot to the start line. */
  readonly startGapM: number;
  /** Brake slide, −1…1 (+ = into a left turn); see drift.ts. */
  readonly drift: number;
}

export interface RiderContext {
  readonly model: SimModel;
  readonly geo: CircuitGeometry;
  readonly limits: CornerLimits;
  readonly clockS: number;
  readonly laps: number;
  readonly assist: boolean;
  readonly autoShift: boolean;
}

export function createRider(
  model: SimModel,
  geo: CircuitGeometry,
  s: number,
  d: number,
): CircuitRider {
  const sim = createInitialState(model);
  return {
    sim,
    input: { throttle: 0, brake: 0, clutchLever: 0 },
    lat: { ...STRAIGHT_AHEAD, s: wrapS(geo, s), d },
    surface: 'track',
    crossings: 0,
    lapStartedAtS: null,
    lapTimesS: [],
    finishedAtS: null,
    progressM: 0,
    crashedUntilS: null,
    startGapM: geo.length - wrapS(geo, s),
    drift: 0,
  };
}

/** Put a crashed (or reset) rider back on the centreline, stopped, in gear. */
export function recoverRider(ctx: RiderContext, rider: CircuitRider): CircuitRider {
  const base = createInitialState(ctx.model);
  const sim: SimState = {
    ...rider.sim,
    speedMps: 0,
    accelerationMps2: 0,
    engineRpm: base.engineRpm,
    engineRunning: true,
    clutchState: 'disengaged',
    gear: rider.sim.gear === null ? null : Math.min(1, rider.sim.gear),
  };
  return {
    ...rider,
    sim,
    lat: { ...STRAIGHT_AHEAD, s: rider.lat.s },
    surface: 'track',
    crashedUntilS: null,
    drift: 0,
  };
}

/** Body with grip and rolling drag adjusted for lean and surface this step. */
function modelFor(ctx: RiderContext, surface: Surface, lean: number): SimModel {
  const grip = gripOn(ctx.limits, surface);
  const share = Math.max(MIN_GRIP_SHARE, longitudinalGripShare(lean, grip));
  const body = ctx.model.body;
  return {
    ...ctx.model,
    body: {
      ...body,
      tractionG: grip * share,
      rollingResistanceCoeff:
        surface === 'track' ? body.rollingResistanceCoeff : RUNOFF_ROLLING_COEFF,
    },
  };
}

/** Slide curvature under the assist: the shortfall past the lean limit, capped by the slide. */
function assistedDrift(
  geo: CircuitGeometry,
  lat: LateralState,
  v: number,
  steer: number,
  grip: number,
  drift: number,
): number {
  const wanted = assistCurvature(geo, lat, v, steer);
  const shortfall = Math.abs(wanted) - leanCurvatureLimit(grip, v);
  if (shortfall <= 0 || Math.sign(wanted) !== Math.sign(drift)) return 0;
  return Math.sign(wanted) * Math.min(shortfall, Math.abs(driftCurvature(drift, v)));
}

export function stepRider(
  ctx: RiderContext,
  rider: CircuitRider,
  input: SimInput,
  steer: number,
  /** Brake + steer held: let the rear slide (player only). */
  driftWanted = false,
): CircuitRider {
  const dt = ctx.model.timestepS;
  if (rider.crashedUntilS !== null) {
    return ctx.clockS >= rider.crashedUntilS ? recoverRider(ctx, rider) : rider;
  }

  let sim = rider.sim;
  let applied = input;
  if (ctx.autoShift) {
    const box = autoGearbox(ctx.model, sim, input.throttle);
    if (box.shift !== 0) sim = shiftGear(ctx.model, sim, box.shift);
    applied = { ...input, clutchLever: box.clutchLever };
  }

  const grip = gripOn(ctx.limits, rider.surface);
  const drift =
    rider.surface === 'track'
      ? stepDrift(rider.drift, driftWanted, steer, rider.sim.speedMps, dt)
      : 0;
  // A sliding rear brakes freely; otherwise braking shares grip with lean.
  const brakeShare = Math.max(
    MIN_GRIP_SHARE,
    Math.abs(drift),
    longitudinalGripShare(rider.lat.lean, grip),
  );
  applied = { ...applied, brake: applied.brake * brakeShare * Math.min(1, grip) };
  sim = step(modelFor(ctx, rider.surface, rider.lat.lean), sim, applied);

  const v = sim.speedMps;
  // With the assist, the steer key starts the slide but doesn't ask to cut
  // across the track, and the slide only adds the turning lean can't give.
  const assistSteer = steer * (1 - Math.abs(drift));
  const kDrift = ctx.assist
    ? assistedDrift(ctx.geo, rider.lat, v, assistSteer, grip, drift)
    : driftCurvature(drift, v);
  const lean = stepLean(
    rider.lat.lean,
    targetLean(ctx.geo, rider.lat, v, assistSteer, grip, ctx.assist, kDrift),
    dt,
  );
  const kPath = pathCurvature(lean, v, steer) + kDrift;
  const moved = integrate(ctx.geo, { ...rider.lat, lean }, v, kPath, dt);
  const surface = surfaceAt(ctx.limits, moved.d);

  // Line crossings come from total progress, so riding back and forth over
  // the line can never count a lap twice.
  const progressM = rider.progressM + moved.ds;
  const reached =
    progressM >= rider.startGapM
      ? Math.floor((progressM - rider.startGapM) / ctx.geo.length) + 1
      : 0;
  const s = wrapS(ctx.geo, moved.s);
  let { crossings, lapStartedAtS, lapTimesS, finishedAtS } = rider;
  if (reached > crossings) {
    crossings = reached;
    if (lapStartedAtS !== null) lapTimesS = [...lapTimesS, ctx.clockS - lapStartedAtS];
    lapStartedAtS = ctx.clockS;
    if (finishedAtS === null && crossings > ctx.laps) finishedAtS = ctx.clockS;
  }

  const next: CircuitRider = {
    sim,
    input: applied,
    lat: { s, d: moved.d, psi: moved.psi, lean },
    surface,
    crossings,
    lapStartedAtS,
    lapTimesS,
    finishedAtS,
    progressM,
    crashedUntilS: null,
    startGapM: rider.startGapM,
    drift,
  };
  if (surface === 'barrier') {
    return {
      ...next,
      sim: { ...sim, speedMps: 0 },
      lat: { ...next.lat, lean: 0 },
      drift: 0,
      crashedUntilS: ctx.clockS + CRASH_RECOVERY_S,
    };
  }
  return next;
}

import { withAutoClutch } from '../simulation/autoClutch';
import { shiftGear } from '../simulation/controls';
import type { SimModel } from '../simulation/model';
import { createInitialState, step } from '../simulation/simulator';
import type { SimInput, SimState } from '../simulation/types';
import { autoGearbox } from './autoGearbox';
import { bounceOffBarrier, HARD_HIT_MPS } from './contacts';
import { driftBrakeShare, driftCurvature, stepDrift } from './drift';
import { sampleAt, wrapS, type CircuitGeometry } from './geometry';
import {
  assistCurvature,
  gripOn,
  leanCurvatureLimit,
  integrate,
  longitudinalGripShare,
  pathCurvature,
  RUNOFF_ROLLING_COEFF,
  runoffBog,
  runoffCurvature,
  STRAIGHT_AHEAD,
  stepLean,
  surfaceAt,
  targetLean,
  type CornerLimits,
  type LateralState,
  type Surface,
} from './lateral';

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
  /** Race-clock time of the last hard hit (barrier or another bike); nobody falls off. */
  readonly hitAtS: number | null;
  /** Race-clock time of the last hard hit on the barrier (spoils the lap for the records). */
  readonly wallHitAtS: number | null;
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
  /** Manual bikes without auto shift: the clutch still slips and bites by itself. */
  readonly autoClutch?: boolean;
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
    hitAtS: null,
    wallHitAtS: null,
    startGapM: geo.length - wrapS(geo, s),
    drift: 0,
  };
}

/** R key: put the rider back on the centreline, stopped, in gear. */
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
    drift: 0,
  };
}

const PERCENT = 100;

/** Body with grip, rolling drag and hill adjusted for lean, surface and place this step. */
function modelFor(ctx: RiderContext, surface: Surface, lean: number, s: number): SimModel {
  const grip = gripOn(ctx.limits, surface);
  const share = Math.max(MIN_GRIP_SHARE, longitudinalGripShare(lean, grip));
  const body = ctx.model.body;
  return {
    ...ctx.model,
    body: {
      ...body,
      tractionG: grip * share,
      gradePercent: sampleAt(ctx.geo, s).grade * PERCENT,
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
  /** Hard on the brake: start (with steer) or hold a rear slide (player only). */
  driftWanted = false,
): CircuitRider {
  const dt = ctx.model.timestepS;

  let sim = rider.sim;
  let applied = input;
  if (ctx.autoShift) {
    const box = autoGearbox(ctx.model, sim, input.throttle, input.brake);
    if (box.shift !== 0) sim = shiftGear(ctx.model, sim, box.shift);
    applied = { ...input, clutchLever: box.clutchLever };
  } else if (ctx.autoClutch) {
    applied = withAutoClutch(ctx.model, sim, input);
  }

  const grip = gripOn(ctx.limits, rider.surface);
  const drift =
    rider.surface === 'track'
      ? stepDrift(rider.drift, driftWanted, steer, rider.sim.speedMps, dt)
      : 0;
  // Upright, braking shares grip with lean; sideways, only the sliding rear brakes.
  const brakeShare = Math.max(
    MIN_GRIP_SHARE,
    driftBrakeShare(drift, longitudinalGripShare(rider.lat.lean, grip)),
  );
  applied = { ...applied, brake: applied.brake * brakeShare * Math.min(1, grip) };
  sim = step(modelFor(ctx, rider.surface, rider.lat.lean, rider.lat.s), sim, applied);
  if (rider.surface === 'runoff') sim = { ...sim, speedMps: runoffBog(sim.speedMps, dt) };

  const v = sim.speedMps;
  // Without the assist the slide turns on top of the lean, so braking into a
  // corner tightens the line. With it the slide only adds what lean can't give.
  const kDrift = ctx.assist
    ? assistedDrift(ctx.geo, rider.lat, v, steer, grip, drift)
    : driftCurvature(drift, v, steer);
  const lean = stepLean(
    rider.lat.lean,
    targetLean(ctx.geo, rider.lat, v, steer, grip, ctx.assist, kDrift),
    dt,
  );
  const kPath =
    pathCurvature(lean, v, steer) +
    kDrift +
    (rider.surface === 'track' ? 0 : runoffCurvature(steer, v));
  const moved = integrate(ctx.geo, { ...rider.lat, lean }, v, kPath, dt);
  // The barrier throws you back off it; you ride on from where you hit.
  const hit = surfaceAt(ctx.limits, moved.d) === 'barrier';
  const bounce = hit ? bounceOffBarrier(ctx.limits, { ...moved, lean }, v) : null;
  const lat = bounce ? bounce.lat : { s: moved.s, d: moved.d, psi: moved.psi, lean };
  if (bounce) sim = { ...sim, speedMps: bounce.speedMps };
  const hard = bounce !== null && bounce.impactMps > HARD_HIT_MPS;
  const surface = surfaceAt(ctx.limits, lat.d);

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

  return {
    sim,
    input: applied,
    lat: { ...lat, s },
    surface,
    crossings,
    lapStartedAtS,
    lapTimesS,
    finishedAtS,
    progressM,
    hitAtS: hard ? ctx.clockS : rider.hitAtS,
    wallHitAtS: hard ? ctx.clockS : rider.wallHitAtS,
    startGapM: rider.startGapM,
    drift: bounce ? 0 : drift,
  };
}

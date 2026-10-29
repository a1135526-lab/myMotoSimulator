import { isFuelCut } from '../engine/ecu';
import { engineTorqueNm } from '../engine/engine';
import { DRIVETRAIN_EFFICIENCY } from '../transmission/finalDrive';
import { longitudinalAccel, tractionLimitN } from '../vehicle/dynamics';
import { clamp, radPerSecToRpm, rpmToRadPerSec } from '../units';
import { resolveCoupling, type Coupling } from './coupling';
import type { SimModel } from './model';
import type { ClutchState, SimInput, SimState } from './types';

/**
 * Two-degree-of-freedom drivetrain, integrated with semi-implicit Euler at a
 * fixed timestep. Everything is expressed on the crank side, with
 * G = engine rad/s per m/s of road speed (from the CVT ratio or the gear):
 *
 *   Engine side   I_e · dω_e/dt = T_engine − T_clutch
 *   Vehicle side  m_eff · dv/dt = T_clutch · G · η − F_resist
 *
 * When the clutch is locked the two sides are rigidly coupled (ω_e = v · G)
 * and solved as one body whose inertia includes the engine reflected through
 * G. Each step re-checks whether the clutch can still carry the required
 * torque; if not it drops to slipping.
 */

/** Crank-side slip below which a slipping clutch locks, rad/s. */
export const LOCK_SLIP_RAD_S = 3;
/** The engine stalls if it is dragged below this fraction of idle rpm. */
export const STALL_RPM_FRACTION = 0.5;
/** A stalled engine that has spun down below this is considered stopped. */
export const STOPPED_RPM = 300;

export function createInitialState(model: SimModel): SimState {
  const d = model.drivetrain;
  return {
    timeS: 0,
    engineRpm: model.engine.idleRpm,
    engineRunning: true,
    drivenRpm: 0,
    speedMps: 0,
    distanceM: 0,
    accelerationMps2: 0,
    gearRatio: d.kind === 'scooter' ? d.variator.lowRatio : 0,
    gear: d.kind === 'manual' ? 0 : null,
    variatorPosition: 0,
    clutchState: 'disengaged',
    throttle: 0,
    brake: 0,
    clutchLever: 0,
    engineTorqueNm: 0,
    enginePowerW: 0,
    wheelPowerW: 0,
    revLimiterActive: false,
  };
}

interface StepOutcome {
  readonly engineRadS: number;
  readonly speedMps: number;
  readonly accelMps2: number;
  readonly driveForceN: number;
  readonly clutchState: ClutchState;
}

interface StepContext {
  readonly model: SimModel;
  readonly coupling: Coupling;
  readonly engineTorque: number;
  readonly brake: number;
  readonly speedMps: number;
  readonly engineRadS: number;
}

function tryLocked(ctx: StepContext): StepOutcome | null {
  const { model, coupling, engineTorque } = ctx;
  const g = coupling.engineRadSPerMps;
  if (g === 0) return null;

  const ie = model.engine.inertiaKgM2;
  const driveForceN = engineTorque * g * DRIVETRAIN_EFFICIENCY;
  // Drive force beyond grip is clipped inside longitudinalAccel — the rider
  // (or traction control) feathers the throttle to stay at the grip limit.
  const accelMps2 = longitudinalAccel(model.body, ctx.speedMps, driveForceN, ctx.brake, ie * g * g);
  // Torque the clutch must transmit to keep both sides in step.
  const required = engineTorque - ie * g * accelMps2;
  const speedMps = Math.max(0, ctx.speedMps + accelMps2 * model.timestepS);
  const engineRadS = speedMps * g;
  const capacity = coupling.capacityAt(engineRadS);

  if (capacity === 0 || Math.abs(required) > capacity) return null;
  return { engineRadS, speedMps, accelMps2, driveForceN, clutchState: 'locked' };
}

function slipping(ctx: StepContext): StepOutcome {
  const { model, coupling } = ctx;
  const dt = model.timestepS;
  const g = coupling.engineRadSPerMps;
  // When the clutch could pass more torque than the tyre can use, grip is the
  // limit: the clutch effectively slips at the traction torque and the rider
  // (or traction control) rolls off so the engine neither bogs to a stall nor
  // flares to the limiter while the bike pulls away at the grip limit.
  const tractionCrankNm = g === 0 ? 0 : tractionLimitN(model.body) / (g * DRIVETRAIN_EFFICIENCY);
  const clutchCapacity = g === 0 ? 0 : coupling.capacityAt(ctx.engineRadS);
  const gripLimited = clutchCapacity > tractionCrankNm;
  const capacity = gripLimited ? tractionCrankNm : clutchCapacity;
  const engineTorque = gripLimited ? Math.min(ctx.engineTorque, capacity) : ctx.engineTorque;
  const slip = ctx.engineRadS - ctx.speedMps * g;
  const clutchTorque = capacity * Math.sign(slip);

  const engineRadS = Math.max(
    0,
    ctx.engineRadS + ((engineTorque - clutchTorque) / model.engine.inertiaKgM2) * dt,
  );
  const driveForceN = clutchTorque * g * DRIVETRAIN_EFFICIENCY;
  const accelMps2 = longitudinalAccel(model.body, ctx.speedMps, driveForceN, ctx.brake);
  const speedMps = Math.max(0, ctx.speedMps + accelMps2 * dt);

  if (capacity === 0) {
    return { engineRadS, speedMps, accelMps2, driveForceN, clutchState: 'disengaged' };
  }

  const newSlip = engineRadS - speedMps * g;
  const crossed = Math.sign(newSlip) !== Math.sign(slip);
  if ((crossed || Math.abs(newSlip) < LOCK_SLIP_RAD_S) && speedMps > 0) {
    // Lock: engine snaps to the wheel side (engine inertia ≪ vehicle inertia).
    return { engineRadS: speedMps * g, speedMps, accelMps2, driveForceN, clutchState: 'locked' };
  }
  return { engineRadS, speedMps, accelMps2, driveForceN, clutchState: 'slipping' };
}

/** Advance the simulation by one fixed timestep. Pure: returns a new state. */
export function step(model: SimModel, prev: SimState, rawInput: SimInput): SimState {
  const input: SimInput = {
    throttle: clamp(rawInput.throttle, 0, 1),
    brake: clamp(rawInput.brake, 0, 1),
    clutchLever: clamp(rawInput.clutchLever, 0, 1),
  };
  const { engine } = model;

  const limiter =
    prev.engineRunning && isFuelCut(prev.engineRpm, engine.revLimitRpm, prev.revLimiterActive);
  const engineTorque = engineTorqueNm(
    engine,
    prev.engineRpm,
    input.throttle,
    limiter || !prev.engineRunning,
  );
  const coupling = resolveCoupling(model, prev, input);

  const ctx: StepContext = {
    model,
    coupling,
    engineTorque,
    brake: input.brake,
    speedMps: prev.speedMps,
    engineRadS: rpmToRadPerSec(prev.engineRpm),
  };
  const out = (prev.clutchState === 'locked' ? tryLocked(ctx) : null) ?? slipping(ctx);

  let engineRpm = radPerSecToRpm(out.engineRadS);
  const engineRunning = prev.engineRunning && engineRpm >= engine.idleRpm * STALL_RPM_FRACTION;
  if (!engineRunning && out.clutchState !== 'locked' && engineRpm < STOPPED_RPM) engineRpm = 0;

  return {
    timeS: prev.timeS + model.timestepS,
    engineRpm,
    engineRunning,
    drivenRpm: radPerSecToRpm(out.speedMps * coupling.engineRadSPerMps),
    speedMps: out.speedMps,
    distanceM: prev.distanceM + out.speedMps * model.timestepS,
    accelerationMps2: out.accelMps2,
    gearRatio: coupling.gearRatio,
    gear: prev.gear,
    variatorPosition: coupling.variatorPosition,
    clutchState: out.clutchState,
    throttle: input.throttle,
    brake: input.brake,
    clutchLever: input.clutchLever,
    engineTorqueNm: engineTorque,
    enginePowerW: engineTorque * out.engineRadS,
    wheelPowerW: out.driveForceN * out.speedMps,
    revLimiterActive: limiter,
  };
}

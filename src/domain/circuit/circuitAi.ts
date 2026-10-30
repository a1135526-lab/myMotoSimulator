import type { RiderSkill } from '../race/opponent';
import { humanReaction } from '../race/reaction';
import type { SimInput } from '../simulation/types';
import { clamp, STANDARD_GRAVITY } from '../units';
import { MAX_BRAKE_DECEL_MPS2 } from '../vehicle/dynamics';
import { wrapS, type CircuitGeometry } from './geometry';

/**
 * AI riders on a circuit.
 *
 * Speed: each sample's corner speed is √(μ_use·g / |κ|); a backwards pass then
 * adds braking zones (v² = v_next² + 2·a·ds). Skill sets how much of the grip
 * the rider dares to use in corners and under braking.
 * Line: the AI rides the steering assist and nudges toward its own lateral line.
 */
export interface CircuitSkill {
  /** Share of available grip used in corners. */
  readonly cornerGripUse: number;
  /** Braking deceleration as a share of grip. */
  readonly brakeGripUse: number;
  readonly reactionS: number;
}

export const CIRCUIT_SKILLS: Readonly<Record<RiderSkill, CircuitSkill>> = {
  novice: { cornerGripUse: 0.62, brakeGripUse: 0.5, reactionS: 0.27 },
  average: { cornerGripUse: 0.78, brakeGripUse: 0.68, reactionS: 0.21 },
  pro: { cornerGripUse: 0.92, brakeGripUse: 0.9, reactionS: 0.16 },
};

/** Grid-mates at one level aren't clones: each gets a small nudge in pace. */
const PERSONALITY = [0, -0.03, 0.02, -0.015] as const;
const MAX_GRIP_USE = 0.94;

export function riderSkill(base: CircuitSkill, index: number): CircuitSkill {
  const k = PERSONALITY[index % PERSONALITY.length] ?? 0;
  return {
    cornerGripUse: Math.min(MAX_GRIP_USE, base.cornerGripUse + k),
    brakeGripUse: Math.min(MAX_GRIP_USE, base.brakeGripUse + k),
    reactionS: humanReaction(base.reactionS - k),
  };
}

/**
 * Brake assist for the player: a safe, average-paced profile. It keeps a
 * beginner on the tarmac; turning it off and braking late is how to beat a pro.
 */
export const ASSIST_SKILL: CircuitSkill = { cornerGripUse: 0.8, brakeGripUse: 0.7, reactionS: 0 };
/** How far ahead the brake assist reads the profile (s), and its tolerance. */
const ASSIST_LOOKAHEAD_S = 0.4;
const ASSIST_BAND_MPS = 1;
/** Brake per m/s of overspeed; the rider can always brake harder. */
const ASSIST_BRAKE_PER_MPS = 0.35;

const MAX_PROFILE_MPS = 120;
/** Look this far ahead (s) when reading the speed profile. */
const LOOKAHEAD_S = 0.6;
const SPEED_BAND_MPS = 1.5;
const LINE_GAIN_PER_M = 0.3;

export type SpeedProfile = Float64Array;

export function speedProfile(
  geo: CircuitGeometry,
  gripG: number,
  skill: CircuitSkill,
): SpeedProfile {
  const n = geo.samples.length;
  const v = new Float64Array(n);
  const corner = gripG * skill.cornerGripUse * STANDARD_GRAVITY;
  geo.samples.forEach((p, i) => {
    const k = Math.abs(p.curvature);
    v[i] = k < 1e-6 ? MAX_PROFILE_MPS : Math.min(MAX_PROFILE_MPS, Math.sqrt(corner / k));
  });
  // Braking zones; two laps backwards so zones wrap across the start line.
  // Real deceleration is capped by the brakes as well as by grip.
  const decel = Math.min(gripG * STANDARD_GRAVITY, MAX_BRAKE_DECEL_MPS2) * skill.brakeGripUse;
  for (let k = 2 * n - 1; k >= 0; k--) {
    const i = k % n;
    const next = v[(i + 1) % n] ?? MAX_PROFILE_MPS;
    v[i] = Math.min(v[i] ?? MAX_PROFILE_MPS, Math.sqrt(next * next + 2 * decel * geo.step));
  }
  return v;
}

export const profileAt = (geo: CircuitGeometry, profile: SpeedProfile, s: number): number =>
  profile[Math.floor(wrapS(geo, s) / geo.step) % profile.length] ?? MAX_PROFILE_MPS;

export interface AiControl {
  readonly input: SimInput;
  readonly steer: number;
}

export function aiControl(
  geo: CircuitGeometry,
  profile: SpeedProfile,
  s: number,
  d: number,
  speedMps: number,
  lineD: number,
  go: boolean,
): AiControl {
  if (!go) return { input: { throttle: 0, brake: 1, clutchLever: 1 }, steer: 0 };
  const target = profileAt(geo, profile, s + speedMps * LOOKAHEAD_S);
  const error = target - speedMps;
  const input: SimInput =
    error > SPEED_BAND_MPS
      ? { throttle: 1, brake: 0, clutchLever: 0 }
      : error < -SPEED_BAND_MPS
        ? { throttle: 0, brake: clamp(-error / 2, 0.4, 1), clutchLever: 0 }
        : { throttle: clamp(0.4 + error / 4, 0, 1), brake: 0, clutchLever: 0 };
  return { input, steer: clamp((lineD - d) * LINE_GAIN_PER_M, -1, 1) };
}

/**
 * Brake assist: when the player is faster than the corner ahead allows, shut
 * the throttle and brake. Inside the limit the player's input is untouched.
 */
export function brakeAssist(
  geo: CircuitGeometry,
  profile: SpeedProfile,
  s: number,
  speedMps: number,
  input: SimInput,
): SimInput {
  const target = profileAt(geo, profile, s + speedMps * ASSIST_LOOKAHEAD_S);
  const over = speedMps - target;
  if (over <= 0) return input;
  const throttle = over > ASSIST_BAND_MPS ? 0 : input.throttle * (1 - over / ASSIST_BAND_MPS);
  const brake = over > ASSIST_BAND_MPS ? clamp(over * ASSIST_BRAKE_PER_MPS, 0.3, 1) : 0;
  return { ...input, throttle, brake: Math.max(input.brake, brake) };
}

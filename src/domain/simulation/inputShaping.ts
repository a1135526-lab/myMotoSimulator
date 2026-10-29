import { clamp } from '../units';
import type { ControlCommand, SimInput } from './types';

/**
 * Converts digital on/off controls into a progressive 0..1 input, like a
 * rider rolling the throttle open rather than snapping it.
 */
/** 0 → 100 % throttle in 0.35 s. */
export const THROTTLE_OPEN_RATE_PER_S = 1 / 0.35;
/** 100 → 0 % in 0.2 s (return spring). */
export const THROTTLE_CLOSE_RATE_PER_S = 1 / 0.2;
export const BRAKE_APPLY_RATE_PER_S = 1 / 0.25;
export const BRAKE_RELEASE_RATE_PER_S = 1 / 0.1;
/**
 * Clutch lever: pulled in instantly, let out over 0.6 s so launches slip
 * naturally. The pull is instant on purpose — on a keyboard, players press
 * Shift and → almost together, and a lever still travelling when the gear
 * goes in would stall the engine every time.
 */
export const CLUTCH_PULL_RATE_PER_S = Number.POSITIVE_INFINITY;
export const CLUTCH_RELEASE_RATE_PER_S = 1 / 0.6;

const approach = (value: number, pressed: boolean, up: number, down: number, dt: number) =>
  clamp(pressed ? value + up * dt : value - down * dt, 0, 1);

export function shapeInput(prev: SimInput, command: ControlCommand, dtS: number): SimInput {
  return {
    throttle: approach(
      prev.throttle,
      command.throttlePressed,
      THROTTLE_OPEN_RATE_PER_S,
      THROTTLE_CLOSE_RATE_PER_S,
      dtS,
    ),
    brake: approach(
      prev.brake,
      command.brakePressed,
      BRAKE_APPLY_RATE_PER_S,
      BRAKE_RELEASE_RATE_PER_S,
      dtS,
    ),
    clutchLever: approach(
      prev.clutchLever,
      command.clutchPressed,
      CLUTCH_PULL_RATE_PER_S,
      CLUTCH_RELEASE_RATE_PER_S,
      dtS,
    ),
  };
}

export const NEUTRAL_INPUT: SimInput = { throttle: 0, brake: 0, clutchLever: 0 };

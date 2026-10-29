/**
 * Pure mapping from engine state to synthesis parameters, kept apart from the
 * Web Audio graph so it can be unit-tested without a browser.
 *
 * A four-stroke fires each cylinder once every two crank turns, so the
 * exhaust pulse rate is  rpm / 60 × cylinders / 2.  That fundamental is what
 * makes a single "thump", a twin "burble" and a four "scream".
 */
export interface EngineSoundInput {
  readonly rpm: number;
  /** 0..1 */
  readonly throttle: number;
  readonly running: boolean;
  readonly limiter: boolean;
  readonly cylinders: number;
}

export interface VoiceParams {
  readonly firingHz: number;
  /** Overall loudness, 0..1. */
  readonly gain: number;
  /** Low-pass cutoff: closed throttle sounds muffled, open sounds bright. */
  readonly cutoffHz: number;
  /** Distortion drive into the waveshaper, 0..1. */
  readonly drive: number;
  /** Intake / exhaust roar (filtered noise), 0..1. */
  readonly noiseGain: number;
}

const SECONDS_PER_MINUTE = 60;
const STROKES_PER_FIRING = 2;
/** Below this the engine is spinning down and fades out. */
const AUDIBLE_RPM = 1000;
const IDLE_GAIN = 0.16;
const LOAD_GAIN = 0.3;
/** Rev limiter chops the sound at this rate (fuel cut on/off). */
export const LIMITER_CHOP_HZ = 22;
const LIMITER_DIP = 0.25;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const firingHz = (rpm: number, cylinders: number): number =>
  (Math.max(0, rpm) / SECONDS_PER_MINUTE) * (cylinders / STROKES_PER_FIRING);

/** `timeS` drives the limiter chop so the output is deterministic for tests. */
export function voiceParams(input: EngineSoundInput, timeS = 0): VoiceParams {
  const load = clamp01(input.throttle);
  const fundamental = firingHz(input.rpm, input.cylinders);
  const spinning = input.running ? 1 : clamp01(input.rpm / AUDIBLE_RPM) * 0.4;
  const chop = input.limiter && Math.floor(timeS * LIMITER_CHOP_HZ * 2) % 2 === 1 ? LIMITER_DIP : 1;

  return {
    firingHz: fundamental,
    gain: (IDLE_GAIN + LOAD_GAIN * load) * clamp01(input.rpm / AUDIBLE_RPM) * spinning * chop,
    cutoffHz: 250 + fundamental * 5 + load * 2800,
    drive: 0.15 + 0.6 * load,
    noiseGain: 0.03 + 0.14 * load,
  };
}

/** Wind rush grows with speed², capped so it never drowns the engine. */
export const windGain = (speedKmh: number): number =>
  Math.min(0.22, (Math.max(0, speedKmh) / 200) ** 2 * 0.22);

/** Opponent's engine fades with distance (inverse-square-ish, 15 m knee). */
export const distanceGain = (gapM: number): number => 1 / (1 + (gapM / 15) ** 2);

/** Odd harmonics of the sub-oscillator give singles and twins their uneven "lump". */
export const subOscillatorMix = (cylinders: number): number => (cylinders <= 2 ? 0.45 : 0.15);

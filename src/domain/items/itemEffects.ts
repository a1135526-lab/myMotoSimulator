import type { SimModel } from '../simulation/model';
import type { TorqueGainCurve } from '../model/tune';
import { ITEM_TUNING as T } from './itemTypes';

/**
 * What items are doing to one rider right now. Times are race-clock seconds;
 * a time in the past means the effect is over. Nobody falls off: a hit is a
 * wobble and a loss of speed.
 */
export interface RiderEffects {
  readonly boostUntilS: number;
  readonly boostAccel: number;
  readonly hitAtS: number | null;
  /** Speed when the hit landed, m/s. */
  readonly hitEntryMps: number;
  readonly slowUntilS: number;
  readonly slowEntryMps: number;
  readonly shieldUntilS: number;
  readonly skateUntilS: number;
}

export const NO_EFFECTS: RiderEffects = {
  boostUntilS: -1,
  boostAccel: 0,
  hitAtS: null,
  hitEntryMps: 0,
  slowUntilS: -1,
  slowEntryMps: 0,
  shieldUntilS: -1,
  skateUntilS: -1,
};

export const hitActive = (e: RiderEffects, clockS: number): boolean =>
  e.hitAtS !== null && clockS < e.hitAtS + T.hitS;

/** Just hit, or just over a hit: another one doesn't land. */
export const immune = (e: RiderEffects, clockS: number): boolean =>
  e.hitAtS !== null && clockS < e.hitAtS + T.hitS + T.immuneS;

export const shielded = (e: RiderEffects, clockS: number): boolean => clockS < e.shieldUntilS;
export const skating = (e: RiderEffects, clockS: number): boolean => clockS < e.skateUntilS;
export const boosting = (e: RiderEffects, clockS: number): boolean => clockS < e.boostUntilS;

export type Landed = 'hit' | 'blocked' | 'missed';

/** A hit arrives: the shield takes it, or it lands (unless the rider is still reeling). */
export function landHit(
  e: RiderEffects,
  clockS: number,
  speedMps: number,
): { effects: RiderEffects; landed: Landed } {
  if (shielded(e, clockS)) return { effects: { ...e, shieldUntilS: -1 }, landed: 'blocked' };
  if (immune(e, clockS)) return { effects: e, landed: 'missed' };
  return {
    effects: { ...e, hitAtS: clockS, hitEntryMps: speedMps, boostUntilS: -1 },
    landed: 'hit',
  };
}

export function landSlow(e: RiderEffects, clockS: number, speedMps: number): RiderEffects {
  if (clockS < e.slowUntilS) return e;
  return { ...e, slowUntilS: clockS + T.tacksSlowS, slowEntryMps: speedMps };
}

export function landSkate(
  e: RiderEffects,
  clockS: number,
): { effects: RiderEffects; landed: Landed } {
  if (shielded(e, clockS)) return { effects: { ...e, shieldUntilS: -1 }, landed: 'blocked' };
  return { effects: { ...e, skateUntilS: clockS + T.skateS, boostUntilS: -1 }, landed: 'hit' };
}

export const startBoost = (e: RiderEffects, clockS: number, s: number, accel: number) => ({
  ...e,
  boostUntilS: clockS + s,
  boostAccel: accel,
});

const scaled = (curve: TorqueGainCurve, k: number): TorqueGainCurve =>
  curve.length === 0
    ? [
        { rpm: 0, gain: k },
        { rpm: 40000, gain: k },
      ]
    : curve.map((p) => ({ ...p, gain: p.gain * k }));

/** Engine output share this step: cut while reeling from a hit or on the skateboard. */
export function powerShare(e: RiderEffects, clockS: number): number {
  let k = 1;
  if (hitActive(e, clockS)) k *= T.hitThrottle;
  if (skating(e, clockS)) k *= T.skatePower;
  return k;
}

/** The bike as the effects leave it this step (same object when nothing applies). */
export function modelWithEffects(model: SimModel, e: RiderEffects, clockS: number): SimModel {
  const k = powerShare(e, clockS);
  if (k === 1) return model;
  return {
    ...model,
    engine: { ...model.engine, intakeExhaustGain: scaled(model.engine.intakeExhaustGain, k) },
  };
}

/** Speed after one step with the effects applied on top of the ride. */
export function effectSpeed(e: RiderEffects, clockS: number, speedMps: number, dt: number): number {
  let v = speedMps;
  if (boosting(e, clockS) && v > 0.5) v += e.boostAccel * dt;
  if (hitActive(e, clockS) && e.hitAtS !== null) {
    const t = Math.min(1, (clockS - e.hitAtS) / T.hitS);
    v = Math.min(v, e.hitEntryMps * (1 - (1 - T.hitKeep) * t));
  }
  if (clockS < e.slowUntilS) v = Math.min(v, Math.max(e.slowEntryMps * T.tacksKeep, 4));
  if (skating(e, clockS)) v = Math.min(v, T.skateTopMps);
  return Math.max(0, v);
}

/** Side-to-side wobble while reeling from a hit, rad (drawn, not ridden). */
export function wobble(e: RiderEffects, clockS: number): number {
  if (!hitActive(e, clockS) || e.hitAtS === null) return 0;
  const t = clockS - e.hitAtS;
  return Math.sin(t * 14) * 0.21 * (1 - t / T.hitS);
}

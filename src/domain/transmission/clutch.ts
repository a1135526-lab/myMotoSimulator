import { rpmToRadPerSec } from '../units';

/**
 * Centrifugal clutch (離合器).
 *
 * Shoe force = centrifugal (∝ ω_shoe²) − spring preload, so transmitted
 * torque capacity grows with ω² once the shoes overcome the springs:
 *
 *   C(ω) = C_lock · (ω² − ω_engage²) / (ω_lock² − ω_engage²),  C ≥ 0
 *
 * Aftermarket clutch springs are labelled by the *engine* rpm at which they
 * engage with the bike stationary (variator at low ratio), so the shoe speeds
 * are derived as engine rpm ÷ lowRatio.
 *
 * C_lock is sized so that at the lock rpm the clutch can just carry WOT
 * torque — this reproduces the classic "engine flares to ~lock rpm and holds
 * while the bike launches" behaviour.
 */

/** Head-room on capacity at lock rpm vs WOT shoe torque. */
export const CLUTCH_CAPACITY_MARGIN = 1.05;

export interface ClutchModel {
  readonly engageShoeRadS: number;
  readonly lockShoeRadS: number;
  readonly capacityAtLockNm: number;
}

export interface ClutchInputs {
  /** Engine rpm at first contact (from the clutch spring choice). */
  readonly engageRpm: number;
  /** Engine rpm span from first contact to full lock (from bike spec). */
  readonly lockSpanRpm: number;
  /** Variator low ratio, to convert engine rpm → shoe speed. */
  readonly lowRatio: number;
  /** Shoe torque the clutch must carry at lock (WOT torque × lowRatio). */
  readonly designShoeTorqueNm: number;
  /** Bell diameter / stock diameter: larger friction radius → more capacity. */
  readonly bellDiameterScale: number;
}

export function buildClutch(i: ClutchInputs): ClutchModel {
  return {
    engageShoeRadS: rpmToRadPerSec(i.engageRpm) / i.lowRatio,
    lockShoeRadS: rpmToRadPerSec(i.engageRpm + i.lockSpanRpm) / i.lowRatio,
    capacityAtLockNm: i.designShoeTorqueNm * CLUTCH_CAPACITY_MARGIN * i.bellDiameterScale,
  };
}

/** Torque capacity (N·m, at the shoes) for the given shoe speed. */
export function clutchCapacityNm(c: ClutchModel, shoeRadS: number): number {
  const e2 = c.engageShoeRadS ** 2;
  const span = c.lockShoeRadS ** 2 - e2;
  const engaged = shoeRadS ** 2 - e2;
  if (engaged <= 0) return 0;
  return (c.capacityAtLockNm * engaged) / span;
}

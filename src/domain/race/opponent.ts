import { shouldUpshift } from '../dyno/autoRider';
import type { SimModel } from '../simulation/model';
import type { SimInput, SimState } from '../simulation/types';

/**
 * AI rider for the opponent. Skill changes three things real drag racers
 * get right or wrong: reaction to the green, how smoothly the clutch is fed
 * out, and where they shift.
 */
export type RiderSkill = 'novice' | 'average' | 'pro';

export interface SkillProfile {
  /** Mean reaction to green, s. */
  readonly reactionS: number;
  /** ± random spread around the mean, s (applied by the caller). */
  readonly reactionJitterS: number;
  /** Lever 100 % → 0 % at launch, s. */
  readonly clutchReleaseS: number;
  /**
   * optimal: shift where the next gear pulls harder (fastest).
   * limiter: hold each gear until the limiter (a little slow).
   * early:   short-shift just past peak torque (noticeably slow).
   */
  readonly shiftStyle: 'optimal' | 'limiter' | 'early';
  /** Launch rpm as a fraction of the bike's ideal launch rpm. */
  readonly launchRpmFactor: number;
}

export const SKILLS: Readonly<Record<RiderSkill, SkillProfile>> = {
  novice: {
    reactionS: 0.55,
    reactionJitterS: 0.15,
    clutchReleaseS: 1.4,
    shiftStyle: 'early',
    launchRpmFactor: 0.7,
  },
  average: {
    reactionS: 0.32,
    reactionJitterS: 0.08,
    clutchReleaseS: 1.0,
    shiftStyle: 'limiter',
    launchRpmFactor: 0.9,
  },
  pro: {
    reactionS: 0.18,
    reactionJitterS: 0.04,
    clutchReleaseS: 0.75,
    shiftStyle: 'optimal',
    launchRpmFactor: 1,
  },
};

const LIMITER_MARGIN_RPM = 150;
/** Scooter brake-stand throttle: enough to reach clutch engagement, not enough to overpower the brake. */
const BRAKE_STAND_THROTTLE = 0.35;
const EARLY_SHIFT_OVER_PEAK_TORQUE = 1.08;

export interface OpponentContext {
  readonly clockS: number;
  /** Race-clock time the opponent reacts: green + their reaction time. */
  readonly goAtS: number;
  readonly skill: SkillProfile;
  /** Bike's peak-torque rpm (for early shifters). */
  readonly peakTorqueRpm: number;
}

export interface OpponentDecision {
  readonly input: SimInput;
  readonly shift: 1 | 0;
}

function wantsUpshift(model: SimModel, sim: SimState, ctx: OpponentContext): boolean {
  const d = model.drivetrain;
  const gear = sim.gear ?? 0;
  if (d.kind !== 'manual' || gear <= 0 || gear >= d.gearRatios.length) return false;
  const limiterRpm = model.engine.revLimitRpm - LIMITER_MARGIN_RPM;
  switch (ctx.skill.shiftStyle) {
    case 'optimal':
      return shouldUpshift(model, d, gear, sim.engineRpm);
    case 'limiter':
      return sim.engineRpm >= limiterRpm;
    case 'early':
      return (
        sim.engineRpm >= Math.min(limiterRpm, ctx.peakTorqueRpm * EARLY_SHIFT_OVER_PEAK_TORQUE)
      );
  }
}

export function opponentInput(
  model: SimModel,
  sim: SimState,
  ctx: OpponentContext,
): OpponentDecision {
  const d = model.drivetrain;
  const waiting = ctx.clockS < ctx.goAtS;

  if (d.kind === 'scooter') {
    // Brake-stand during the countdown: rear brake on, throttle cracked open so
    // the CVT clutch is already biting when the brake comes off at green.
    const countingDown = waiting && ctx.clockS >= 0;
    const input = waiting
      ? { throttle: countingDown ? BRAKE_STAND_THROTTLE : 0, brake: countingDown ? 1 : 0 }
      : { throttle: 1, brake: 0 };
    return { input: { ...input, clutchLever: 0 }, shift: 0 };
  }

  if (waiting) {
    // Clutch in, holding the launch rpm on the throttle.
    const target = d.launchRpm * ctx.skill.launchRpmFactor;
    return {
      input: { throttle: sim.engineRpm < target ? 1 : 0.15, brake: 0, clutchLever: 1 },
      shift: 0,
    };
  }

  const clutchLever = Math.max(0, sim.clutchLever - model.timestepS / ctx.skill.clutchReleaseS);
  const settled = clutchLever === 0 && sim.clutchState === 'locked';
  return {
    input: { throttle: 1, brake: 0, clutchLever },
    shift: settled && wantsUpshift(model, sim, ctx) ? 1 : 0,
  };
}

import type { SimInput, SimState } from '../simulation/types';

/**
 * Start-light reaction rules shared by the drag strip and the circuit grid.
 *
 * A launch is the moment the rider *asks* the bike to go — throttle on with the
 * brake off and the clutch letting go, in gear — not when the bike has rolled
 * far enough to trip a beam. Comparing that to the light catches anticipation:
 * nobody sees a light, decides and moves a hand in under 0.1 s (the same limit
 * athletics uses for sprint starts), so anything quicker was a guess.
 */
export const MIN_HUMAN_REACTION_S = 0.1;

/** Throttle opened past this. */
const THROTTLE_ON = 0.05;
/** Brake let off below this. */
const BRAKE_OFF = 0.8;
/** Clutch lever started its release below this. */
const CLUTCH_LETTING_GO = 0.95;

export function launchIntent(input: SimInput, sim: SimState): boolean {
  const inGear = sim.gear === null || sim.gear > 0;
  return (
    sim.engineRunning &&
    inGear &&
    input.throttle > THROTTLE_ON &&
    input.brake < BRAKE_OFF &&
    input.clutchLever < CLUTCH_LETTING_GO
  );
}

/** Launched before the light, or too soon after it for a human to have seen it. */
export const isJumpStart = (launchAtS: number, lightAtS: number): boolean =>
  launchAtS < lightAtS + MIN_HUMAN_REACTION_S;

/** Reaction from a sampled value: never quicker than a person can actually react. */
export const humanReaction = (sampledS: number): number =>
  Math.max(MIN_HUMAN_REACTION_S + 0.02, sampledS);

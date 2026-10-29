/**
 * Drag-strip start lights ("Christmas tree").
 *
 * Sportsman tree: three ambers light 0.5 s apart, green 0.5 s after the last.
 * Pro tree:       all three ambers together, green 0.4 s later.
 * The countdown starts after a randomised stage delay so riders can't
 * anticipate it; the application supplies that delay.
 */
export type TreeMode = 'sportsman' | 'pro';

export const AMBER_INTERVAL_S = 0.5;
export const PRO_GREEN_DELAY_S = 0.4;

export interface TreeTiming {
  readonly ambersAtS: readonly [number, number, number];
  readonly greenAtS: number;
}

export function treeTiming(mode: TreeMode, stageDelayS: number): TreeTiming {
  if (mode === 'pro') {
    return {
      ambersAtS: [stageDelayS, stageDelayS, stageDelayS],
      greenAtS: stageDelayS + PRO_GREEN_DELAY_S,
    };
  }
  return {
    ambersAtS: [stageDelayS, stageDelayS + AMBER_INTERVAL_S, stageDelayS + 2 * AMBER_INTERVAL_S],
    greenAtS: stageDelayS + 3 * AMBER_INTERVAL_S,
  };
}

export interface TreeLights {
  readonly ambers: readonly [boolean, boolean, boolean];
  readonly green: boolean;
}

export function treeLights(timing: TreeTiming, clockS: number): TreeLights {
  const green = clockS >= timing.greenAtS;
  const [a, b, c] = timing.ambersAtS;
  // Ambers go dark when green comes on, as on a real tree.
  return { ambers: [!green && clockS >= a, !green && clockS >= b, !green && clockS >= c], green };
}

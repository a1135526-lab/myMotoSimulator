import { CIRCUIT_SKILLS, riderSkill, type CircuitSettings, type CircuitSetup } from '@/domain';
import type { CircuitConfig } from './CircuitController';

/** Random hold after the fifth red light, s (MotoGP: 0.2–3 s). */
export const LIGHTS_HOLD_RANGE_S: readonly [number, number] = [0.4, 2.5];

/** The race setup from the garage / room settings: aids, grip, AI pace, the grid. */
export function circuitSetup(
  config: CircuitConfig,
  random: () => number,
  holdS: number | undefined,
  roomGrid: { readonly slot: number; readonly field: number } | null,
): CircuitSetup {
  const { circuit, opponents, skill, laps, assist, brakeAssist, autoShift, autoClutch } = config;
  const settings: CircuitSettings = {
    laps,
    assist,
    brakeAssist,
    autoShift,
    autoClutch,
    limits: { halfWidth: circuit.widthM / 2, runoffM: circuit.runoffM, gripG: circuit.gripG },
  };
  const [lo, hi] = LIGHTS_HOLD_RANGE_S;
  return {
    settings,
    aiSkills: opponents.map((_, i) => riderSkill(config.aiSkill ?? CIRCUIT_SKILLS[skill], i)),
    holdS: holdS ?? lo + random() * (hi - lo),
    grid: config.grid ?? 'staggered',
    ...(roomGrid && { playerSlot: roomGrid.slot, field: roomGrid.field }),
  };
}

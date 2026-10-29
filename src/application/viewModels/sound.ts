import { getBike } from '@/data';
import { mpsToKmh } from '@/domain';
import { useConfigStore } from '../stores/configStore';
import { useRaceStore } from '../stores/raceStore';
import { useSimStore } from '../stores/simStore';

/** What the audio layer needs to voice one engine. */
export interface EngineSoundState {
  readonly rpm: number;
  /** 0..1 */
  readonly throttle: number;
  readonly running: boolean;
  readonly limiter: boolean;
  readonly cylinders: number;
}

export interface SoundFrame {
  readonly player: EngineSoundState & { readonly speedKmh: number };
  /** Race only. gapM: + = opponent ahead of the player. */
  readonly opponent?: EngineSoundState & { readonly gapM: number };
}

const PERCENT = 100;

/**
 * Imperative readers, called from the audio loop every animation frame.
 * They read stores directly so sound never causes React re-renders.
 */
export function readSimulatorSound(): SoundFrame | null {
  const sim = useSimStore.getState().snapshot?.sim;
  if (!sim) return null;
  const bike = getBike(useConfigStore.getState().bikeId);
  return {
    player: {
      rpm: sim.engineRpm,
      throttle: sim.throttle,
      running: sim.engineRunning,
      limiter: sim.revLimiterActive,
      cylinders: bike.engine.cylinders,
      speedKmh: mpsToKmh(sim.speedMps),
    },
  };
}

export function readRaceSound(): SoundFrame | null {
  const view = useRaceStore.getState().view;
  if (!view) return null;
  const voice = (r: typeof view.player): EngineSoundState => ({
    rpm: r.rpm,
    throttle: r.throttlePct / PERCENT,
    running: r.engineRunning,
    limiter: r.revLimiter,
    cylinders: r.cylinders,
  });
  return {
    player: { ...voice(view.player), speedKmh: view.player.speedKmh },
    opponent: { ...voice(view.opponent), gapM: -view.gapM },
  };
}

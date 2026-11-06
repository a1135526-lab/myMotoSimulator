import {
  GHOST_SAMPLE_S,
  riderPose,
  type CircuitGeometry,
  type CircuitRaceState,
  type GhostSample,
} from '@/domain';

const SAMPLE_SLACK_S = 1e-6;

export interface CompletedLap {
  readonly lapS: number;
  readonly samples: readonly GhostSample[];
  /** No crash and no reset to the racing line: fit for the leaderboard and the ghost. */
  readonly clean: boolean;
  /** Race clock when it was completed, s. */
  readonly atS: number;
}

/**
 * Follows the player through each lap, keeping a pose every tenth of a second,
 * and hands back the lap when it's completed.
 */
export class LapRecorder {
  private lapStartedAtS: number | null = null;
  private lapsDone = 0;
  private samples: GhostSample[] = [];
  private clean = true;
  private seenHitAtS: number | null = null;
  private lastSampleT = -Infinity;

  /** R was pressed: this lap doesn't count. */
  markDirty(): void {
    this.clean = false;
  }

  /** Call after every physics advance. */
  observe(geo: CircuitGeometry, race: CircuitRaceState): CompletedLap | null {
    const p = race.riders[0];
    if (!p) return null;
    // A hard hit (barrier or another bike) spoils the lap, like R does.
    if (p.hitAtS !== this.seenHitAtS) {
      this.seenHitAtS = p.hitAtS;
      this.clean = false;
    }

    let completed: CompletedLap | null = null;
    if (p.lapTimesS.length > this.lapsDone) {
      this.lapsDone = p.lapTimesS.length;
      const lapS = p.lapTimesS[p.lapTimesS.length - 1] ?? 0;
      const last = this.samples[this.samples.length - 1];
      if (this.lapStartedAtS !== null && last) {
        // Close the line at the finish so playback reaches the full lap time.
        const finish = { ...riderPose(geo, p), t: lapS };
        completed = {
          lapS,
          samples: [...this.samples, finish],
          clean: this.clean,
          atS: race.clockS,
        };
      }
    }

    if (p.lapStartedAtS !== this.lapStartedAtS) {
      this.lapStartedAtS = p.lapStartedAtS;
      this.samples = [];
      this.clean = true;
      this.lastSampleT = -Infinity;
    }
    if (this.lapStartedAtS !== null) {
      const t = race.clockS - this.lapStartedAtS;
      // Frames add up to a tenth with rounding error (3 × 1/30 = 0.0999…); allow it.
      if (t - this.lastSampleT >= GHOST_SAMPLE_S - SAMPLE_SLACK_S) {
        this.samples.push({ ...riderPose(geo, p), t });
        this.lastSampleT = t;
      }
    }
    return completed;
  }
}

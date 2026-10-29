import type { RaceState } from './race';
import type { RacerState } from './racer';

export type Side = 'player' | 'opponent';

export interface RacerResult {
  /** Green → leaving the stage beam. Negative on a false start. */
  readonly reactionS: number | null;
  /** Elapsed time: stage beam → finish line. */
  readonly elapsedS: number | null;
  /** Green → finish line (reaction + ET) — what decides the race. */
  readonly totalS: number | null;
  readonly trapSpeedKmh: number | null;
  readonly falseStart: boolean;
  readonly finished: boolean;
}

export interface RaceResult {
  readonly winner: Side | null;
  readonly reason: 'finish' | 'falseStart' | 'dnf' | 'none';
  readonly player: RacerResult;
  readonly opponent: RacerResult;
  /** Winning margin, s (total time difference). */
  readonly marginS: number | null;
}

export function racerResult(racer: RacerState, greenAtS: number): RacerResult {
  const { leftAtS, finishedAtS } = racer;
  return {
    reactionS: leftAtS === null ? null : leftAtS - greenAtS,
    elapsedS: leftAtS !== null && finishedAtS !== null ? finishedAtS - leftAtS : null,
    totalS: finishedAtS === null ? null : finishedAtS - greenAtS,
    trapSpeedKmh: racer.trapSpeedKmh,
    falseStart: racer.falseStart,
    finished: finishedAtS !== null,
  };
}

/**
 * A false start loses outright (if both jump, the earlier jump loses).
 * Otherwise the first across the line wins; a bike that never finishes is a DNF.
 */
export function raceResult(race: RaceState): RaceResult {
  const green = race.tree.greenAtS;
  const player = racerResult(race.player, green);
  const opponent = racerResult(race.opponent, green);
  const base = { player, opponent, marginS: null };

  if (player.falseStart || opponent.falseStart) {
    const playerJumped =
      player.falseStart &&
      (!opponent.falseStart || (player.reactionS ?? 0) <= (opponent.reactionS ?? 0));
    return { ...base, winner: playerJumped ? 'opponent' : 'player', reason: 'falseStart' };
  }
  if (player.totalS !== null && opponent.totalS !== null) {
    const winner = player.totalS <= opponent.totalS ? 'player' : 'opponent';
    return {
      ...base,
      winner,
      reason: 'finish',
      marginS: Math.abs(player.totalS - opponent.totalS),
    };
  }
  if (race.phase === 'finished') {
    if (player.finished) return { ...base, winner: 'player', reason: 'dnf' };
    if (opponent.finished) return { ...base, winner: 'opponent', reason: 'dnf' };
  }
  return { ...base, winner: null, reason: 'none' };
}

import { create } from 'zustand';
import { isRankedDifficulty, type RankedDifficulty } from '@/domain';

const KEY = 'scooter-dyno:ranked-difficulty';

function load(): RankedDifficulty {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return isRankedDifficulty(raw) ? raw : 'normal';
  } catch {
    return 'normal';
  }
}

interface RankedPrefs {
  /** How hard the AI rides if no one is matched; remembered between visits. */
  readonly difficulty: RankedDifficulty;
  setDifficulty(difficulty: RankedDifficulty): void;
}

export const useRankedPrefs = create<RankedPrefs>()((set) => ({
  difficulty: load(),
  setDifficulty: (difficulty) => {
    try {
      globalThis.localStorage?.setItem(KEY, difficulty);
    } catch {
      // Private mode: just this visit.
    }
    set({ difficulty });
  },
}));

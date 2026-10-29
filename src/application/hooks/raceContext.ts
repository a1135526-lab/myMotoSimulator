import { createContext, useContext } from 'react';
import type { RaceController } from '../race/RaceController';

export const RaceContext = createContext<RaceController | null>(null);

export function useRaceController(): RaceController {
  const controller = useContext(RaceContext);
  if (!controller) throw new Error('useRaceController must be used inside RaceProvider');
  return controller;
}

import { createContext, useContext } from 'react';
import type { SimulationController } from '../simulation/SimulationController';

export const SimulationContext = createContext<SimulationController | null>(null);

export function useSimulationController(): SimulationController {
  const controller = useContext(SimulationContext);
  if (!controller)
    throw new Error('useSimulationController must be used inside SimulationProvider');
  return controller;
}

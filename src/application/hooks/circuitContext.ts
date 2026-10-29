import { createContext, useContext } from 'react';
import type { CircuitController } from '../race/CircuitController';

export const CircuitContext = createContext<CircuitController | null>(null);

export function useCircuitController(): CircuitController {
  const controller = useContext(CircuitContext);
  if (!controller) throw new Error('useCircuitController must be used inside CircuitProvider');
  return controller;
}

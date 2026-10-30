import { createContext, useContext } from 'react';
import type { StreetController } from '../street/StreetController';

export const StreetContext = createContext<StreetController | null>(null);

export function useStreetController(): StreetController {
  const controller = useContext(StreetContext);
  if (!controller) throw new Error('useStreetController must be used inside StreetProvider');
  return controller;
}

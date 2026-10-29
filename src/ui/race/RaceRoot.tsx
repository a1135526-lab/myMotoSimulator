import { CircuitProvider, RaceProvider, useRaceStore } from '@/application';
import { CircuitPage } from './circuit/CircuitPage';
import { RacePage } from './RacePage';
import { RaceWizard } from './setup/RaceWizard';

/**
 * Lazy-loaded entry for race mode, so Three.js only downloads when needed.
 * The race (and its keyboard / animation loop) only exists on the last step.
 */
export default function RaceRoot() {
  const step = useRaceStore((s) => s.step);
  const discipline = useRaceStore((s) => s.discipline);
  if (step !== 'race') return <RaceWizard />;
  if (discipline === 'circuit') {
    return (
      <CircuitProvider>
        <CircuitPage />
      </CircuitProvider>
    );
  }
  return (
    <RaceProvider>
      <RacePage />
    </RaceProvider>
  );
}

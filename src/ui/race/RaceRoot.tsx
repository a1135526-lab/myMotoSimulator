import { RaceProvider } from '@/application';
import { RacePage } from './RacePage';

/** Lazy-loaded entry for race mode, so Three.js only downloads when needed. */
export default function RaceRoot() {
  return (
    <RaceProvider>
      <RacePage />
    </RaceProvider>
  );
}

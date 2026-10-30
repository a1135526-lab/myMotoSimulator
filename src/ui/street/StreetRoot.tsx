import { StreetProvider, useStreetStore } from '@/application';
import { StreetPage } from './StreetPage';
import { StreetSetup } from './StreetSetup';

/**
 * Lazy-loaded entry for the street mode (Three.js only downloads when it's
 * opened). The ride, and its keyboard / animation loop, exist only once out
 * of the setup page.
 */
export default function StreetRoot() {
  const stage = useStreetStore((s) => s.stage);
  if (stage === 'setup') return <StreetSetup />;
  return (
    <StreetProvider>
      <StreetPage />
    </StreetProvider>
  );
}

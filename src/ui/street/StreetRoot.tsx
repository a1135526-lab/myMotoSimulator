import { StreetProvider, useCityMap, useStreetStore } from '@/application';
import { StreetPage } from './StreetPage';
import { StreetSetup } from './StreetSetup';

/**
 * Lazy-loaded entry for the street mode (Three.js only downloads when it's
 * opened). The city's map data starts loading on the setup page; the ride,
 * and its keyboard / animation loop, exist only once out of setup.
 */
export default function StreetRoot() {
  const stage = useStreetStore((s) => s.stage);
  const map = useCityMap();
  if (stage === 'setup') return <StreetSetup ready={map !== null} />;
  if (!map) return <p style={{ padding: 16 }}>載入楠梓地圖中…</p>;
  return (
    <StreetProvider map={map}>
      <StreetPage map={map} />
    </StreetProvider>
  );
}

import { lazy, Suspense } from 'react';
import { SimulationProvider, useUiStore } from '@/application';
import { SimulatorPage } from '@/ui/pages/SimulatorPage';

const RaceRoot = lazy(() => import('@/ui/race/RaceRoot'));

/**
 * Only one mode is mounted at a time, so only one controller owns the
 * keyboard and the animation loop.
 */
export function App() {
  const mode = useUiStore((s) => s.mode);
  if (mode === 'race') {
    return (
      <Suspense fallback={<p style={{ padding: 16 }}>載入 3D 賽道中…</p>}>
        <RaceRoot />
      </Suspense>
    );
  }
  return (
    <SimulationProvider>
      <SimulatorPage />
    </SimulationProvider>
  );
}

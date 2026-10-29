import { SimulationProvider } from '@/application';
import { SimulatorPage } from '@/ui/pages/SimulatorPage';

export function App() {
  return (
    <SimulationProvider>
      <SimulatorPage />
    </SimulationProvider>
  );
}

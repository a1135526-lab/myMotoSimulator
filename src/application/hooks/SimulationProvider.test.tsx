import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import type { SimulationController } from '../simulation/SimulationController';
import { SimulationProvider } from './SimulationProvider';
import { useSimulationController } from './simulationContext';

describe('SimulationProvider', () => {
  it('on-screen buttons still drive the bike after StrictMode remounts the provider', () => {
    let controller: SimulationController | null = null;
    function Probe() {
      controller = useSimulationController();
      return null;
    }
    render(
      <StrictMode>
        <SimulationProvider>
          <Probe />
        </SimulationProvider>
      </StrictMode>,
    );
    if (!controller) throw new Error('no controller');
    const c: SimulationController = controller;
    c.touch.press('throttle');
    expect(c.input.read().throttlePressed).toBe(true);
    c.touch.release('throttle');
    expect(c.input.read().throttlePressed).toBe(false);
  });
});

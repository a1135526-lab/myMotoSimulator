import { useEffect } from 'react';
/** Anything advanced by wall-clock time: the simulator or a race. */
export interface Tickable {
  tick(elapsedS: number): void;
}

const MS_PER_S = 1000;

/**
 * Drives the controller from requestAnimationFrame. Physics stays on its own
 * fixed timestep inside the controller; this loop only reports wall time.
 */
export function useSimulationLoop(controller: Tickable): void {
  useEffect(() => {
    let frame = 0;
    let last: number | null = null;

    const loop = (now: number) => {
      if (last !== null) controller.tick((now - last) / MS_PER_S);
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [controller]);
}

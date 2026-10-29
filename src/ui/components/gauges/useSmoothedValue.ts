import { useEffect, useRef, useState } from 'react';

/** Higher = snappier needle. 14/s settles ~95 % in ~0.2 s. */
const DEFAULT_RATE_PER_S = 14;
const EPSILON = 0.001;
const MS_PER_S = 1000;

/**
 * Exponential lerp toward `target` on animation frames, so the needle sweeps
 * smoothly instead of jumping between telemetry samples. Purely visual.
 *
 * The animation loop persists across target changes (the target is read from
 * a ref); restarting it on every 60 Hz telemetry update would reset the frame
 * clock each time and the needle would never move.
 */
export function useSmoothedValue(target: number, ratePerS = DEFAULT_RATE_PER_S): number {
  const [value, setValue] = useState(target);
  const targetRef = useRef(target);
  const current = useRef(target);
  const frame = useRef(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = target;
    if (frame.current !== 0) return;

    const animate = (now: number) => {
      const dt = last.current === null ? 0 : (now - last.current) / MS_PER_S;
      last.current = now;
      const goal = targetRef.current;
      const next = current.current + (goal - current.current) * (1 - Math.exp(-dt * ratePerS));
      const done = Math.abs(goal - next) <= EPSILON * Math.max(1, Math.abs(goal));
      current.current = done ? goal : next;
      setValue(current.current);
      if (done) {
        frame.current = 0;
        last.current = null;
      } else {
        frame.current = requestAnimationFrame(animate);
      }
    };
    frame.current = requestAnimationFrame(animate);
  }, [target, ratePerS]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  return value;
}

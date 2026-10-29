import { useMemo } from 'react';
import styles from './circuit.module.css';

interface MapSample {
  readonly x: number;
  readonly z: number;
}

interface Dot {
  readonly x: number;
  readonly z: number;
  readonly player: boolean;
}

interface CircuitMapProps {
  samples: readonly MapSample[];
  dots?: readonly Dot[];
  className?: string;
}

const PAD = 0.08;
const EVERY = 4;

/** Track outline as SVG (north = −z), with optional rider dots — card thumbnail and HUD minimap. */
export function CircuitMap({ samples, dots = [], className }: CircuitMapProps) {
  const frame = useMemo(() => {
    const xs = samples.map((p) => p.x);
    const zs = samples.map((p) => p.z);
    const minX = Math.min(...xs);
    const minZ = Math.min(...zs);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...zs) - minZ) || 1;
    const scale = (1 - 2 * PAD) / span;
    const map = (x: number, z: number) => ({
      u: PAD + (x - minX) * scale,
      v: PAD + (z - minZ) * scale,
    });
    const d =
      samples
        .filter((_, i) => i % EVERY === 0)
        .map((p, i) => {
          const { u, v } = map(p.x, p.z);
          return `${i === 0 ? 'M' : 'L'}${u.toFixed(4)},${v.toFixed(4)}`;
        })
        .join(' ') + ' Z';
    const start = samples[0] ? map(samples[0].x, samples[0].z) : { u: 0, v: 0 };
    return { d, map, start };
  }, [samples]);

  return (
    <svg viewBox="0 0 1 1" className={className ?? styles.map} aria-hidden>
      <path d={frame.d} className={styles.mapTrack} />
      <circle cx={frame.start.u} cy={frame.start.v} r={0.025} className={styles.mapStart} />
      {dots.map((dot, i) => {
        const { u, v } = frame.map(dot.x, dot.z);
        return (
          <circle
            key={i}
            cx={u}
            cy={v}
            r={dot.player ? 0.035 : 0.028}
            className={dot.player ? styles.mapPlayer : styles.mapRival}
          />
        );
      })}
    </svg>
  );
}

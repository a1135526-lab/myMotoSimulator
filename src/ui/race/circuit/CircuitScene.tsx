import { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '@/application';
import type { SceneTheme } from '../scene/theme';
import { CircuitRenderer } from './scene/CircuitRenderer';
import styles from '../race.module.css';

/** Hosts the circuit canvas; renders on its own frame loop straight from the store. */
export function CircuitScene({ theme }: { theme: Pick<SceneTheme, 'sky' | 'scenery'> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: CircuitRenderer;
    try {
      renderer = new CircuitRenderer(canvas, theme);
    } catch {
      setUnsupported(true);
      return;
    }
    const observer = new ResizeObserver(() => renderer.resize());
    observer.observe(canvas);
    let frame = 0;
    const loop = () => {
      const { view, camera } = useCircuitStore.getState();
      if (view) renderer.render(view, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
    // Theme is fixed for a race; the page remounts when the circuit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} data-testid="circuit-canvas" />
      {unsupported && <p className={styles.unsupported}>此裝置不支援 WebGL，無法顯示 3D 賽道。</p>}
    </>
  );
}

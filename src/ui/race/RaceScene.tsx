import { useEffect, useRef, useState } from 'react';
import { useRaceStore } from '@/application';
import { RaceRenderer } from './scene/RaceRenderer';
import styles from './race.module.css';

/**
 * Hosts the Three.js canvas. Rendering runs on its own animation frame and
 * reads the latest race view straight from the store, so the 3D scene never
 * triggers React re-renders.
 */
export function RaceScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: RaceRenderer;
    try {
      renderer = new RaceRenderer(canvas);
    } catch {
      setUnsupported(true);
      return;
    }

    const observer = new ResizeObserver(() => renderer.resize());
    observer.observe(canvas);
    let frame = 0;
    const loop = () => {
      const view = useRaceStore.getState().view;
      if (view) renderer.render(view);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} data-testid="race-canvas" />
      {unsupported && (
        <p className={styles.unsupported}>
          此裝置不支援 WebGL，無法顯示 3D 賽道；下方數據仍可正常比賽。
        </p>
      )}
    </>
  );
}

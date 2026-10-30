import { useEffect, useRef, useState } from 'react';
import { useStreetStore, type TimeOfDay } from '@/application';
import type { CityMap } from '@/domain';
import { StreetRenderer } from './scene/StreetRenderer';
import styles from '../race/race.module.css';

/** Hosts the city canvas; renders on its own frame loop straight from the store. */
export function StreetScene({ map, timeOfDay }: { map: CityMap; timeOfDay: TimeOfDay }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: StreetRenderer;
    try {
      renderer = new StreetRenderer(canvas, map, timeOfDay);
    } catch {
      setUnsupported(true);
      return;
    }
    const observer = new ResizeObserver(() => renderer.resize());
    observer.observe(canvas);
    let frame = 0;
    const loop = () => {
      const { view, camera } = useStreetStore.getState();
      if (view) renderer.render(view, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [map, timeOfDay]);

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} data-testid="street-canvas" />
      {unsupported && <p className={styles.unsupported}>此裝置不支援 WebGL，無法顯示 3D 街景。</p>}
    </>
  );
}

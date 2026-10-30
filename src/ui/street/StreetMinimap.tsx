import { useEffect } from 'react';
import type { StreetView } from '@/application';
import type { CityMap } from '@/domain';
import { drawMap } from './map/mapDraw';
import { useCanvas2d } from './map/useCanvas2d';
import styles from './street.module.css';

/** Pixels per metre on the minimap (≈ 450 m across). */
const SCALE = 0.42;

/**
 * Round minimap around the rider: turns with the bike unless north-up is
 * chosen. Click it for the big map.
 */
export function StreetMinimap({
  map,
  view,
  northUp,
  onOpen,
  onToggleNorth,
}: {
  map: CityMap;
  view: StreetView;
  northUp: boolean;
  onOpen: () => void;
  onToggleNorth: () => void;
}) {
  const { ref, ctx, size } = useCanvas2d();
  const { x, z, heading } = view.rider;
  const rotation = northUp ? 0 : -Math.PI / 2 - heading;

  useEffect(() => {
    if (!ctx || size.width === 0) return;
    drawMap(
      ctx,
      map,
      { cx: x, cz: z, scale: SCALE, rotation, width: size.width, height: size.height },
      { view, nav: view.nav, cars: true },
    );
  });

  const north = (rotation * 180) / Math.PI;
  return (
    <div className={styles.minimapBox}>
      <button
        type="button"
        className={styles.minimapButton}
        onClick={onOpen}
        title="打開大地圖（M）"
        aria-label="打開大地圖"
      >
        <canvas
          ref={ref}
          className={styles.minimap}
          aria-label="小地圖"
          data-testid="street-minimap"
        />
      </button>
      <button
        type="button"
        className={styles.compass}
        onClick={onToggleNorth}
        style={{ transform: `rotate(${north}deg)` }}
        title={northUp ? '改成車頭朝上' : '改成北方朝上'}
        aria-label={northUp ? '小地圖：北方朝上' : '小地圖：車頭朝上'}
        data-testid="minimap-north"
      >
        N
      </button>
      <p className={styles.roadName} data-testid="street-road">
        {view.place.road ?? '未命名道路'}
      </p>
    </div>
  );
}

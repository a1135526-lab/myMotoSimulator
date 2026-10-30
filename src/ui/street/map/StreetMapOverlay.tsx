import { useEffect, useMemo, useRef, useState } from 'react';
import {
  placesOfKind,
  pointLabel,
  useStreetController,
  type PlaceResult,
  type StreetView,
} from '@/application';
import type { CityMap, PoiKind } from '@/domain';
import { MapLegend, ScaleBar } from './MapLegend';
import { MapSidePanel } from './MapSidePanel';
import { drawMap, toScreen, toWorld, type MapViewport } from './mapDraw';
import styles from './mapOverlay.module.css';
import { useCanvas2d } from './useCanvas2d';

const MIN_SCALE = 0.06;
const MAX_SCALE = 4;
const START_SCALE = 0.55;
const DRAG_PX = 5;
const POI_HIT_PX = 13;
/** Landmarks always shown on the big map. */
const MAJOR: readonly PoiKind[] = ['station', 'mrt', 'university', 'school', 'hospital', 'park'];

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Full-screen city map: pan, zoom, search, and pick a destination for the sat-nav. */
export function StreetMapOverlay({
  map,
  view,
  onClose,
}: {
  map: CityMap;
  view: StreetView;
  onClose: () => void;
}) {
  const controller = useStreetController();
  const { ref, ctx, size } = useCanvas2d();
  const [centre, setCentre] = useState({ x: view.rider.x, z: view.rider.z });
  const [scale, setScale] = useState(START_SCALE);
  const [category, setCategory] = useState<PoiKind | null>(null);
  const [focus, setFocus] = useState<PlaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cz: number; moved: boolean } | null>(
    null,
  );

  const vp: MapViewport = { cx: centre.x, cz: centre.z, scale, rotation: 0, ...size };
  const from = { x: view.rider.x, z: view.rider.z };
  const pois = useMemo(() => {
    const shown = category ? [category] : MAJOR;
    return shown.flatMap((k) => placesOfKind(map, k, from, 200));
    // Only the category changes which landmarks are drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, category]);

  useEffect(() => {
    if (!ctx || size.width === 0) return;
    drawMap(ctx, map, vp, { view, nav: view.nav, pois, pin: focus, labels: true });
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = (x: number, z: number, label: string) => {
    const ok = controller.setDestination({ x, z, label });
    setError(ok ? null : '找不到可以騎到那裡的路線');
    setFocus(null);
  };
  const pick = (p: PlaceResult) => {
    setCentre({ x: p.x, z: p.z });
    setScale((s) => Math.max(s, 0.9));
    choose(p.x, p.z, p.name);
  };

  const local = (e: React.PointerEvent | React.WheelEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    const p = local(e);
    drag.current = { ...p, cx: centre.x, cz: centre.z, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = local(e);
    if (Math.hypot(p.x - d.x, p.y - d.y) > DRAG_PX) d.moved = true;
    if (d.moved) setCentre({ x: d.cx - (p.x - d.x) / scale, z: d.cz - (p.y - d.y) / scale });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const p = local(e);
    const hit = pois.find((poi) => {
      const s = toScreen(vp, poi.x, poi.z);
      return Math.hypot(s.x - p.x, s.y - p.y) < POI_HIT_PX;
    });
    if (hit) return choose(hit.x, hit.z, hit.name);
    const w = toWorld(vp, p.x, p.y);
    choose(w.x, w.z, pointLabel(map, w.x, w.z));
  };
  const onWheel = (e: React.WheelEvent) => {
    const p = local(e);
    const before = toWorld(vp, p.x, p.y);
    const next = clampScale(scale * Math.exp(-e.deltaY * 0.0015));
    // Keep the point under the cursor still.
    setCentre({
      x: before.x - (p.x - size.width / 2) / next,
      z: before.z - (p.y - size.height / 2) / next,
    });
    setScale(next);
  };
  const zoom = (f: number) => setScale((s) => clampScale(s * f));

  return (
    <div className={styles.overlay} role="dialog" aria-label="大地圖" data-testid="street-map">
      <MapSidePanel
        map={map}
        from={from}
        nav={view.nav}
        error={error}
        category={category}
        onCategory={setCategory}
        onPick={pick}
        onFocus={setFocus}
        onStart={onClose}
        onClear={() => controller.clearDestination()}
      />
      <div className={styles.mapArea}>
        <canvas
          ref={ref}
          className={styles.canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          data-testid="map-canvas"
        />
        <div className={styles.tools}>
          <button type="button" onClick={onClose} className={styles.close} data-testid="map-close">
            ✕ 關閉（M）
          </button>
          <button type="button" onClick={() => zoom(1.4)} aria-label="放大">
            ＋
          </button>
          <button type="button" onClick={() => zoom(1 / 1.4)} aria-label="縮小">
            －
          </button>
          <button type="button" onClick={() => setCentre(from)} data-testid="map-recenter">
            ◎ 我的位置
          </button>
        </div>
        <div className={styles.compass} aria-label="北方朝上">
          N
        </div>
        <ScaleBar scale={scale} />
        <MapLegend />
        <p className={styles.attribution}>{view.attribution}</p>
      </div>
    </div>
  );
}

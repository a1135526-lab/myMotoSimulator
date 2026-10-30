import { useState } from 'react';
import {
  formatDistance,
  placesOfKind,
  POI_ICONS,
  POI_LABELS,
  searchPlaces,
  type NavView,
  type PlaceResult,
} from '@/application';
import type { CityMap, PoiKind } from '@/domain';
import styles from './mapOverlay.module.css';

/** Categories offered as one-tap lists, in the order riders look for them. */
const CATEGORY_ORDER: readonly PoiKind[] = [
  'station',
  'mrt',
  'school',
  'university',
  'hospital',
  'park',
  'convenience',
  'fuel',
  'market',
  'temple',
  'government',
  'food',
];

interface SidePanelProps {
  map: CityMap;
  from: { x: number; z: number };
  nav: NavView | null;
  error: string | null;
  category: PoiKind | null;
  onCategory: (k: PoiKind | null) => void;
  onPick: (place: PlaceResult) => void;
  onFocus: (place: PlaceResult) => void;
  onStart: () => void;
  onClear: () => void;
}

/** Search, category lists and the planned route's summary. */
export function MapSidePanel(props: SidePanelProps) {
  const { map, from, nav, category } = props;
  const [query, setQuery] = useState('');
  const results = query.trim()
    ? searchPlaces(map, query, from)
    : category
      ? placesOfKind(map, category, from)
      : [];
  const away = (p: PlaceResult) => formatDistance(Math.hypot(p.x - from.x, p.z - from.z));

  return (
    <aside className={styles.side}>
      <input
        className={styles.search}
        type="search"
        placeholder="搜尋地點或路名，例如：楠梓車站、德民路"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="搜尋地點"
        data-testid="map-search"
      />
      <div className={styles.categories} role="radiogroup" aria-label="地點類別">
        {CATEGORY_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={category === k}
            className={category === k ? styles.catActive : styles.cat}
            onClick={() => props.onCategory(category === k ? null : k)}
            data-testid={`map-cat-${k}`}
          >
            {POI_ICONS[k]} {POI_LABELS[k]}
          </button>
        ))}
      </div>
      {(query.trim() || category) && (
        <ul className={styles.results} data-testid="map-results">
          {results.length === 0 && <li className={styles.empty}>找不到符合的地點</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={styles.result}
                onClick={() => props.onPick(r)}
                onMouseEnter={() => props.onFocus(r)}
              >
                <span className={styles.resultIcon}>{r.icon}</span>
                <span className={styles.resultName}>{r.name}</span>
                <span className={styles.resultMeta}>
                  {r.kindLabel} · {away(r)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {props.error && <p className={styles.error}>{props.error}</p>}
      {nav && (
        <section className={styles.route} data-testid="map-route">
          <p className={styles.routeTo}>📍 {nav.label}</p>
          <p className={styles.routeMeta}>
            {formatDistance(nav.remainingM)} · 約 {Math.max(1, Math.round(nav.etaS / 60))} 分鐘
          </p>
          <div className={styles.routeButtons}>
            <button
              type="button"
              className={styles.start}
              onClick={props.onStart}
              data-testid="map-start"
            >
              開始導航
            </button>
            <button
              type="button"
              className={styles.clear}
              onClick={props.onClear}
              data-testid="map-clear"
            >
              清除路線
            </button>
          </div>
        </section>
      )}
      <p className={styles.hint}>在地圖上點一下也能設定目的地 · 拖曳平移 · 滾輪縮放</p>
    </aside>
  );
}

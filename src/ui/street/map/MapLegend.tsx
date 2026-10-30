import { AREA_FILL, ROAD_COLOR } from './mapDraw';
import styles from './mapOverlay.module.css';

const ROADS = [
  ['primary', '主要道路'],
  ['tertiary', '一般道路'],
  ['residential', '巷弄'],
] as const;
const AREAS = [
  ['park', '公園綠地'],
  ['water', '河川水域'],
  ['school', '學校'],
  ['industrial', '工業區'],
] as const;

export function MapLegend() {
  return (
    <dl className={styles.legend} aria-label="圖例">
      {ROADS.map(([k, label]) => (
        <div key={k}>
          <dt className={styles.legendRoad} style={{ background: ROAD_COLOR[k] }} />
          <dd>{label}</dd>
        </div>
      ))}
      {AREAS.map(([k, label]) => (
        <div key={k}>
          <dt className={styles.legendArea} style={{ background: AREA_FILL[k] }} />
          <dd>{label}</dd>
        </div>
      ))}
      <div>
        <dt className={styles.legendRoad} style={{ background: '#2fb4ff' }} />
        <dd>導航路線</dd>
      </div>
    </dl>
  );
}

const NICE_M = [20, 50, 100, 200, 500, 1000, 2000, 5000];

/** A scale bar about 100 px long, at a round distance. */
export function ScaleBar({ scale }: { scale: number }) {
  const m = NICE_M.find((d) => d * scale >= 70) ?? 5000;
  return (
    <div className={styles.scaleBar} aria-label="比例尺">
      <span style={{ width: `${m * scale}px` }} />
      {m >= 1000 ? `${m / 1000} km` : `${m} m`}
    </div>
  );
}

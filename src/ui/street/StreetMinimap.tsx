import { useMemo } from 'react';
import type { StreetView } from '@/application';
import type { CityMap } from '@/domain';
import styles from './street.module.css';

/** Metres shown across the minimap. */
const SPAN_M = 520;
const DISTRICT_FILL: Readonly<Record<string, string>> = {
  downtown: '#3b4250',
  commercial: '#3a4048',
  residential: '#383d42',
  industrial: '#3c3a36',
  park: '#2f5a33',
  waterfront: '#3a4246',
};

/** North-up map around the rider: roads, blocks, sea, traffic and the rider's arrow. */
export function StreetMinimap({ map, view }: { map: CityMap; view: StreetView }) {
  const base = useMemo(
    () => (
      <>
        <rect
          x={-4000}
          y={-4000}
          width={map.width + 8000}
          height={map.shoreZ + 4000}
          fill="#26292d"
        />
        <rect x={-4000} y={map.shoreZ} width={map.width + 8000} height={6000} fill="#1c3f52" />
        {map.blocks.map((b, i) => (
          <rect
            key={i}
            x={b.rect.x0}
            y={b.rect.z0}
            width={b.rect.x1 - b.rect.x0}
            height={b.rect.z1 - b.rect.z0}
            fill={DISTRICT_FILL[b.district]}
          />
        ))}
        {map.roads.map((r) => (
          <rect
            key={r.id}
            x={r.rect.x0}
            y={r.rect.z0}
            width={r.rect.x1 - r.rect.x0}
            height={r.rect.z1 - r.rect.z0}
            className={r.kind === 'street' ? styles.mapStreet : styles.mapAvenue}
          />
        ))}
      </>
    ),
    [map],
  );
  const { x, z, heading } = view.rider;
  const deg = (heading * 180) / Math.PI;
  return (
    <svg
      className={styles.minimap}
      viewBox={`${x - SPAN_M / 2} ${z - SPAN_M / 2} ${SPAN_M} ${SPAN_M}`}
      aria-label="小地圖"
      data-testid="street-minimap"
    >
      {base}
      {view.cars.map((c) => (
        <circle key={c.id} cx={c.x} cy={c.z} r={4} className={styles.mapCar} />
      ))}
      <g transform={`translate(${x} ${z}) rotate(${deg})`}>
        <path d="M 14 0 L -9 -8 L -4 0 L -9 8 Z" className={styles.mapPlayer} />
      </g>
    </svg>
  );
}

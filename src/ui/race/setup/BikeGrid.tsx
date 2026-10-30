import { useState } from 'react';
import {
  BAND_CHIPS,
  groupBikes,
  STYLE_CHIPS,
  useBikeCards,
  type BandFilter,
  type FilterChip,
  type StyleFilter,
} from '@/application';
import { BikeCard } from './BikeCard';
import grid from './bikeGrid.module.css';
import styles from './setup.module.css';

interface BikeGridProps {
  selectedId: string;
  onSelect: (id: string) => void;
  testIdPrefix: string;
}

function Chips<T extends string>({
  label,
  chips,
  value,
  onChange,
  testId,
}: {
  label: string;
  chips: readonly FilterChip<T>[];
  value: T;
  onChange: (v: T) => void;
  testId: string;
}) {
  return (
    <div className={grid.filterRow}>
      <span className={grid.filterLabel}>{label}</span>
      <div className={styles.filters} role="radiogroup" aria-label={label}>
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value === c.id}
            className={`${value === c.id ? styles.chipActive : styles.chip} ${c.sub ? grid.sub : ''}`}
            onClick={() => onChange(c.id)}
            data-testid={`${testId}-${c.id}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Bike cards filtered by 車種 and 排氣量, in displacement-band sections. */
export function BikeGrid({ selectedId, onSelect, testIdPrefix }: BikeGridProps) {
  const cards = useBikeCards();
  const [style, setStyle] = useState<StyleFilter>('all');
  const [band, setBand] = useState<BandFilter>('all');
  const groups = groupBikes(cards, style, band);

  return (
    <>
      <Chips label="車種" chips={STYLE_CHIPS} value={style} onChange={setStyle} testId="style" />
      <Chips label="排氣量" chips={BAND_CHIPS} value={band} onChange={setBand} testId="band" />
      {groups.length === 0 && <p className={grid.empty}>沒有符合條件的車款，換個篩選試試。</p>}
      {groups.map((g) => (
        <section key={g.band} className={grid.section} aria-label={g.label}>
          <h3 className={grid.heading}>
            {g.label}
            <span className={grid.count}>{g.bikes.length} 台</span>
          </h3>
          <div className={styles.grid}>
            {g.bikes.map((bike) => (
              <BikeCard
                key={bike.id}
                bike={bike}
                selected={bike.id === selectedId}
                onSelect={() => onSelect(bike.id)}
                testId={`${testIdPrefix}-${bike.id}`}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

import { useState } from 'react';
import { KIND_LABELS, useBikeCards, type BikeCardView } from '@/application';
import { BikeCard } from './BikeCard';
import styles from './setup.module.css';

type KindFilter = 'all' | BikeCardView['kind'];
const FILTERS: KindFilter[] = ['all', 'scooter', 'manual'];

interface BikeGridProps {
  selectedId: string;
  onSelect: (id: string) => void;
  testIdPrefix: string;
}

/** Filterable grid of bike cards with stock ET on the chosen track. */
export function BikeGrid({ selectedId, onSelect, testIdPrefix }: BikeGridProps) {
  const cards = useBikeCards();
  const [filter, setFilter] = useState<KindFilter>('all');
  const shown = cards.filter((c) => filter === 'all' || c.kind === filter);

  return (
    <>
      <div className={styles.filters} role="radiogroup" aria-label="車種">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            className={filter === f ? styles.chipActive : styles.chip}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : KIND_LABELS[f]}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {shown.map((bike) => (
          <BikeCard
            key={bike.id}
            bike={bike}
            selected={bike.id === selectedId}
            onSelect={() => onSelect(bike.id)}
            testId={`${testIdPrefix}-${bike.id}`}
          />
        ))}
      </div>
    </>
  );
}

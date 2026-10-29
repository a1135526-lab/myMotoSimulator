import type { BikeCardView } from '@/application';
import styles from './setup.module.css';

/** Scale for the stat bars: roughly the strongest bike in the catalogue. */
const MAX_PS_PER_100KG = 45;

const fmtTime = (s: number | null) => {
  if (s === null) return '跑不完';
  if (s < 60) return `${s.toFixed(2)} s`;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
};

interface BikeCardProps {
  bike: BikeCardView;
  selected: boolean;
  onSelect: () => void;
  testId?: string;
}

export function BikeCard({ bike, selected, onSelect, testId }: BikeCardProps) {
  const ratio = Math.min(1, bike.psPer100Kg / MAX_PS_PER_100KG);
  return (
    <button
      type="button"
      className={selected ? styles.bikeCardSelected : styles.bikeCard}
      aria-pressed={selected}
      onClick={onSelect}
      data-testid={testId}
    >
      <span className={styles.cardBadge}>{bike.badge}</span>
      <strong className={styles.cardTitle}>{bike.name}</strong>
      <span className={styles.cardMeta}>
        {bike.displacementCc} cc・{bike.cylinders} 缸・{bike.ps} ps・{bike.massKg} kg
      </span>
      <span className={styles.statLabel}>馬力重量比</span>
      <span className={styles.statBar} aria-hidden>
        <span style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className={styles.cardEt}>
        原廠{bike.estimateLabel} <b className="tabular">{fmtTime(bike.estimate.seconds)}</b>
      </span>
    </button>
  );
}

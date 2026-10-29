import type { Provenance } from '@/domain';
import styles from './common.module.css';

const KIND_LABEL: Record<Provenance['kind'], string> = {
  official: '官方',
  measured: '實測',
  community: '車友資料',
  estimated: '估計值',
};

/** "估計值" unless the data is verified; hover shows the note and sources. */
export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  const label = provenance.verified ? `${KIND_LABEL[provenance.kind]}・已查證` : '估計值';
  const title = [`來源類型：${KIND_LABEL[provenance.kind]}`, provenance.note, ...provenance.sources]
    .filter(Boolean)
    .join('\n');

  return (
    <span
      className={provenance.verified ? styles.badgeVerified : styles.badgeEstimate}
      title={title}
    >
      {label}
    </span>
  );
}

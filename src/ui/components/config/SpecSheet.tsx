import { useBikeSpecSheet } from '@/application';
import { Panel } from '../common/Panel';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import styles from './config.module.css';

/** Sources may be URLs or free-text citations (e.g. an owner's observation). */
function hostnameOf(source: string): string | null {
  try {
    const url = new URL(source);
    return url.protocol.startsWith('http') ? url.hostname : null;
  } catch {
    return null;
  }
}

/** Stock spec of the selected bike, each section tagged with where its numbers came from. */
export function SpecSheet() {
  const { title, subtitle, sections } = useBikeSpecSheet();
  return (
    <Panel title={`${title} 原廠規格・${subtitle}`}>
      <div className={styles.spec}>
        {sections.map((section) => (
          <section key={section.title}>
            <h3 className={styles.specTitle}>
              {section.title}
              <ProvenanceBadge provenance={section.provenance} />
            </h3>
            <dl>
              {section.rows.map((row) => (
                <div key={row.label} className={styles.specRow}>
                  <dt>{row.label}</dt>
                  <dd className="tabular">{row.value}</dd>
                </div>
              ))}
            </dl>
            {section.provenance.note && <p className={styles.hint}>{section.provenance.note}</p>}
            {section.provenance.sources.map((source) => {
              const host = hostnameOf(source);
              return host ? (
                <a
                  key={source}
                  href={source}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.source}
                >
                  {host}
                </a>
              ) : (
                <p key={source} className={styles.hint}>
                  來源：{source}
                </p>
              );
            })}
          </section>
        ))}
      </div>
    </Panel>
  );
}

import type { DynoSummary } from '@/application';
import { SERIES_COLOR } from './seriesStyle';
import styles from './dyno.module.css';

const fmt = (v: number | undefined, digits: number, unit: string) =>
  v === undefined ? '—' : `${v.toFixed(digits)} ${unit}`;

const COLUMNS: { label: string; render: (s: DynoSummary) => string }[] = [
  { label: '最大馬力', render: (s) => `${s.peakPs.toFixed(1)} ps @ ${s.peakPsRpm}` },
  { label: '最大扭力', render: (s) => `${s.peakKgfm.toFixed(2)} kgf·m @ ${s.peakKgfmRpm}` },
  { label: '後輪馬力', render: (s) => fmt(s.peakWheelPs, 1, 'ps') },
  { label: '0–60 km/h', render: (s) => fmt(s.zeroTo60S, 2, 's') },
  { label: '0–100 m', render: (s) => fmt(s.zeroTo100mS, 2, 's') },
  { label: '0–400 m', render: (s) => fmt(s.zeroTo400mS, 2, 's') },
  { label: '極速', render: (s) => fmt(s.topSpeedKmh, 1, 'km/h') },
];

export function DynoSummaryTable({ summaries }: { summaries: readonly DynoSummary[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid="dyno-summary">
        <thead>
          <tr>
            <th scope="col">設定</th>
            {COLUMNS.map((c) => (
              <th key={c.label} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.key}>
              <th scope="row">
                <span className={styles.swatch} style={{ background: SERIES_COLOR[s.key] }} />
                {s.label}
              </th>
              {COLUMNS.map((c) => (
                <td key={c.label} className="tabular">
                  {c.render(s)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

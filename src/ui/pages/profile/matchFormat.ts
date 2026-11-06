import type { MatchKind, MatchRecord } from '@/application';
import { fmtLap } from '../../race/circuit/format';

/** Race time: m:ss.000 on circuits, seconds on a drag strip. */
export const fmtRaceTime = (kind: MatchKind, s: number | null) =>
  s === null ? '—' : kind === 'drag' ? `${s.toFixed(3)} s` : fmtLap(s);

export const dateTime = (ms: number) => {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
};

export function resultLabel(m: MatchRecord): string {
  if (m.dnf) return m.kind === 'drag' ? '搶跑' : '未完賽';
  return m.won ? '🏆 第 1 名' : `第 ${m.position} 名`;
}

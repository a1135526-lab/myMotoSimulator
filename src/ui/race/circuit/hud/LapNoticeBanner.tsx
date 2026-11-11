import { useEffect, useState } from 'react';
import { useCircuitStore, type LapNotice } from '@/application';
import { onlineText } from '../../../components/online/onlineText';
import { fmtLap } from '../format';
import styles from './hud.module.css';

/** Short, so it never sits over the road for long. */
const SHOW_MS = 2200;

function message(n: LapNotice): { text: string; tone: 'best' | 'ok' | 'void' } {
  if (!n.clean) return { text: `${fmtLap(n.lapS)} · 撞牆或重置，這圈不列入紀錄`, tone: 'void' };
  if (n.best) return { text: `🏆 新紀錄！${fmtLap(n.lapS)} · 幽靈車已更新`, tone: 'best' };
  if (n.place !== null) return { text: `${fmtLap(n.lapS)} · 本機排行第 ${n.place} 名`, tone: 'ok' };
  return { text: fmtLap(n.lapS), tone: 'ok' };
}

/** Briefly after each lap, under the lap times: the time and where it landed on the board. */
export function LapNoticeBanner() {
  const notice = useCircuitStore((s) => s.lapNotice);
  const [shown, setShown] = useState<LapNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    setShown(notice);
    const timer = window.setTimeout(() => setShown(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!shown) return null;
  const { text, tone } = message(shown);
  const online = onlineText(shown.online);
  return (
    <p className={styles.lapNotice} data-tone={tone} role="status" data-testid="lap-notice">
      {text}
      {online && <small className={styles.lapNoticeOnline}>{online}</small>}
    </p>
  );
}

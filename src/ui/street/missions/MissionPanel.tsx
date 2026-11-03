import { useMemo } from 'react';
import {
  streetMissions,
  useRecordsStore,
  useStreetController,
  useStreetStore,
  type StreetMission,
} from '@/application';
import type { CityMap } from '@/domain';
import { formatDistanceKm } from './distance';
import { fmtClock, fmtRunTime, starText } from './format';
import styles from './missions.module.css';

/** The mission list: pick one and ride from the station against the clock. */
export function MissionPanel({ map }: { map: CityMap }) {
  const open = useStreetStore((s) => s.missionsOpen);
  const setOpen = useStreetStore((s) => s.setMissionsOpen);
  const setResult = useStreetStore((s) => s.setMissionResult);
  const boards = useRecordsStore((s) => s.missions);
  const controller = useStreetController();
  const missions = useMemo(() => streetMissions(map), [map]);
  if (!open) return null;

  const start = (m: StreetMission) => {
    setResult(null);
    if (controller.startMission(m)) setOpen(false);
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-label="街景任務"
      data-testid="mission-panel"
    >
      <section className={styles.panel}>
        <header className={styles.head}>
          <h2>🏁 街景任務</h2>
          <p>從楠梓火車站出發，跟著導航騎到目的地。越快星星越多，成績記在這台裝置上。</p>
          <button
            type="button"
            className={styles.close}
            onClick={() => setOpen(false)}
            aria-label="關閉"
          >
            ✕
          </button>
        </header>
        <ol className={styles.list}>
          {missions.map((m) => {
            const best = boards[m.id]?.[0];
            return (
              <li key={m.id} className={styles.item}>
                <span className={styles.icon} aria-hidden>
                  {m.icon}
                </span>
                <div className={styles.info}>
                  <strong>{m.title}</strong>
                  <span>{m.brief}</span>
                  <small>
                    {m.place} · {formatDistanceKm(m.routeM)} · 限時 {fmtClock(m.limitS)}
                  </small>
                </div>
                <div className={styles.best}>
                  {best ? (
                    <>
                      <span className={styles.stars} aria-label={`${best.stars} 顆星`}>
                        {starText(best.stars)}
                      </span>
                      <small>最佳 {fmtRunTime(best.timeS)}</small>
                    </>
                  ) : (
                    <small>尚未挑戰</small>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.go}
                  onClick={() => start(m)}
                  data-testid={`mission-${m.id}`}
                >
                  出發
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

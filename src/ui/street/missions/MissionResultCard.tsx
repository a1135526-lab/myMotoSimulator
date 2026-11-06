import { useMemo } from 'react';
import {
  streetMissions,
  useRecordsStore,
  useStreetController,
  useStreetStore,
} from '@/application';
import type { CityMap } from '@/domain';
import { onlineText } from '../../components/online/onlineText';
import { fmtClock, fmtRunTime, starText } from './format';
import styles from './missions.module.css';

/** On arrival: time, stars, place on the board, and go again. */
export function MissionResultCard({ map }: { map: CityMap }) {
  const result = useStreetStore((s) => s.missionResult);
  const setResult = useStreetStore((s) => s.setMissionResult);
  const setMissionsOpen = useStreetStore((s) => s.setMissionsOpen);
  const board = useRecordsStore((s) => (result ? s.missions[result.id] : undefined));
  const controller = useStreetController();
  const mission = useMemo(
    () => streetMissions(map).find((m) => m.id === result?.id),
    [map, result?.id],
  );
  if (!result || !mission) return null;

  const close = () => {
    setResult(null);
    controller.clearDestination();
  };
  const retry = () => {
    setResult(null);
    controller.startMission(mission);
  };
  const late = result.stars === 0;

  return (
    <div className={styles.resultBackdrop}>
      <section
        className={styles.result}
        role="dialog"
        aria-label="任務結果"
        data-testid="mission-result"
      >
        <p className={styles.kicker}>
          {mission.icon} {mission.title}
        </p>
        <p
          className={styles.bigStars}
          data-late={late || undefined}
          aria-label={`${result.stars} 顆星`}
        >
          {starText(result.stars)}
        </p>
        <h2>{late ? '超時了，但還是送到了' : result.best ? '🏆 新紀錄！' : '任務完成'}</h2>
        <dl className={styles.facts}>
          <div>
            <dt>用時</dt>
            <dd data-testid="mission-time">{fmtRunTime(result.timeS)}</dd>
          </div>
          <div>
            <dt>限時</dt>
            <dd>{fmtClock(result.limitS)}</dd>
          </div>
          <div>
            <dt>碰撞</dt>
            <dd>{result.crashes} 次</dd>
          </div>
          <div>
            <dt>本機排名</dt>
            <dd>{result.place ? `第 ${result.place} 名` : '未進前 5'}</dd>
          </div>
        </dl>
        {onlineText(result.online) && (
          <p className={styles.online} data-testid="mission-online">
            {onlineText(result.online)}
          </p>
        )}
        {board && board.length > 0 && (
          <ol className={styles.board}>
            {board.map((r, i) => (
              <li key={`${r.at}-${r.timeS}`} data-me={i + 1 === result.place || undefined}>
                <span>{i + 1}</span>
                <strong>{fmtRunTime(r.timeS)}</strong>
                <span className={styles.boardStars}>{starText(r.stars)}</span>
                <small>{r.bike}</small>
              </li>
            ))}
          </ol>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => {
              close();
              setMissionsOpen(true);
            }}
          >
            其他任務
          </button>
          <button type="button" onClick={close}>
            自由騎乘
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={retry}
            data-testid="mission-retry"
          >
            再挑戰
          </button>
        </div>
      </section>
    </div>
  );
}

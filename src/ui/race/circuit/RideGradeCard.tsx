import type { RideGrades, RideTally, ScoreKey } from '@/domain';
import styles from './grades.module.css';

const LABELS: Readonly<Record<ScoreKey, string>> = {
  cornering: '過彎速度',
  limits: '賽道界線',
  clean: '乾淨騎乘',
  consistency: '圈速穩定',
  shifting: '換檔時機',
  launch: '起步反應',
  drift: '甩尾過彎',
};

const seconds = (s: number) => `${s.toFixed(1)} 秒`;

function detail(key: ScoreKey, t: RideTally, reactionS: number | null, score: number): string {
  switch (key) {
    case 'cornering':
      return `彎中最低速度約為職業車手的 ${Math.round((t.cornerPace / Math.max(t.corners, 1)) * 100)}%`;
    case 'limits':
      return t.excursions === 0 && t.resets === 0
        ? '全程沒有衝出賽道'
        : `衝出賽道 ${t.excursions} 次 · 草地上 ${seconds(t.offTrackS)}` +
            (t.resets ? ` · 重置 ${t.resets} 次` : '');
    case 'clean':
      return t.hits === 0 ? '沒有碰撞' : `碰撞 ${t.hits} 次`;
    case 'consistency':
      return score >= 80 ? '每圈時間很接近' : '每圈時間差距偏大';
    case 'shifting':
      return (
        `升檔 ${t.upshifts} 次，${t.goodUpshifts} 次在最佳轉速` +
        (t.limiterS > 1 ? ` · 撞斷油 ${seconds(t.limiterS)}` : '')
      );
    case 'launch':
      return reactionS === null
        ? '—'
        : reactionS < 0
          ? '偷跑'
          : `燈滅後 ${reactionS.toFixed(3)} 秒起步`;
    case 'drift':
      return t.drifts === 0 ? '沒有成功的甩尾（煞車＋轉向）' : `成功甩尾 ${t.drifts} 次`;
  }
}

/** The grades at the flag: overall letter, then one row per part. */
export function RideGradeCard({
  grades,
  reactionS,
}: {
  grades: RideGrades;
  reactionS: number | null;
}) {
  return (
    <section className={styles.card} aria-label="騎乘評分" data-testid="ride-grades">
      <div className={styles.overall}>
        <span className={styles.letter} data-grade={grades.grade} data-testid="ride-grade">
          {grades.grade}
        </span>
        <span className={styles.overallText}>
          綜合評分
          <strong>{grades.score}</strong>
        </span>
      </div>
      <ul className={styles.items}>
        {grades.items.map((item) => (
          <li key={item.key} data-testid={`grade-${item.key}`}>
            <span className={styles.itemLetter} data-grade={item.grade}>
              {item.grade}
            </span>
            <span className={styles.itemBody}>
              <span className={styles.itemHead}>
                {LABELS[item.key]}
                <small>{item.score}</small>
              </span>
              <span className={styles.bar} aria-hidden>
                <span style={{ width: `${item.score}%` }} data-grade={item.grade} />
              </span>
              <span className={styles.itemDetail}>
                {detail(item.key, grades.tally, reactionS, item.score)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

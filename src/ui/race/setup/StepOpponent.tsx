import {
  SKILL_LABELS,
  TUNE_LEVEL_LABELS,
  useMatchupEstimate,
  useRaceStore,
  type TuneLevel,
} from '@/application';
import type { RiderSkill } from '@/domain';
import { BikeGrid } from './BikeGrid';
import styles from './setup.module.css';

const LEVELS = Object.keys(TUNE_LEVEL_LABELS) as TuneLevel[];
const SKILLS = Object.keys(SKILL_LABELS) as RiderSkill[];

function Matchup() {
  const opp = useRaceStore((s) => s.opponent);
  const {
    label,
    player: p,
    opponent: o,
  } = useMatchupEstimate(opp.bikeId, opp.tuneLevel, opp.riderMassKg);
  let verdict = '無法預估';
  if (p !== null && o !== null) {
    const diff = Math.abs(p - o);
    verdict =
      diff < 0.05
        ? '勢均力敵，看反應！'
        : p < o
          ? `你的車快 ${diff.toFixed(2)} 秒`
          : `對手快 ${diff.toFixed(2)} 秒`;
  }
  return (
    <aside className={styles.matchup} data-testid="matchup">
      <div>
        <span>你</span>
        <b className="tabular">{p === null ? '—' : `${p.toFixed(2)} s`}</b>
      </div>
      <strong className={styles.vs}>VS</strong>
      <div>
        <span>對手</span>
        <b className="tabular">{o === null ? '—' : `${o.toFixed(2)} s`}</b>
      </div>
      <p className={styles.verdict}>{verdict}</p>
      <p className={styles.hint}>{label}（程式騎士、不含反應時間）。實際勝負還要看你的操作。</p>
    </aside>
  );
}

export function StepOpponent() {
  const opponent = useRaceStore((s) => s.opponent);
  const setOpponent = useRaceStore((s) => s.setOpponent);

  return (
    <>
      <Matchup />
      <div className={styles.options}>
        <div className={styles.option}>
          改裝
          <div className={styles.filters}>
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className={opponent.tuneLevel === l ? styles.chipActive : styles.chip}
                onClick={() => setOpponent({ tuneLevel: l })}
                data-testid={`opponent-tune-${l}`}
              >
                {TUNE_LEVEL_LABELS[l].split('（')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.option}>
          騎士
          <div className={styles.filters}>
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                className={opponent.skill === s ? styles.chipActive : styles.chip}
                onClick={() => setOpponent({ skill: s })}
                title={SKILL_LABELS[s]}
                data-testid={`opponent-skill-${s}`}
              >
                {SKILL_LABELS[s].split('：')[0]}
              </button>
            ))}
          </div>
        </div>
        <label className={styles.option}>
          體重
          <input
            type="range"
            min={45}
            max={120}
            value={opponent.riderMassKg}
            onChange={(e) => setOpponent({ riderMassKg: Number(e.target.value) })}
          />
          <output className="tabular">{opponent.riderMassKg} kg</output>
        </label>
      </div>
      <BikeGrid
        selectedId={opponent.bikeId}
        onSelect={(bikeId) => setOpponent({ bikeId })}
        testIdPrefix="opponent-card"
      />
    </>
  );
}

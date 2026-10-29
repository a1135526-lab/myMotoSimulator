import {
  DISTANCE_PRESETS_M,
  SKILL_LABELS,
  TUNE_LEVEL_LABELS,
  useBikeCatalog,
  useCurrentBike,
  useRaceStore,
  useUiStore,
  type TuneLevel,
} from '@/application';
import type { RiderSkill } from '@/domain';
import { Panel } from '../components/common/Panel';
import styles from './race.module.css';

const LEVELS = Object.keys(TUNE_LEVEL_LABELS) as TuneLevel[];
const SKILLS = Object.keys(SKILL_LABELS) as RiderSkill[];

export function RaceSetupPanel({ locked }: { locked: boolean }) {
  const catalog = useBikeCatalog();
  const playerBike = useCurrentBike();
  const setMode = useUiStore((s) => s.setMode);
  const { distanceM, treeMode, opponent } = useRaceStore();
  const { setDistance, setTreeMode, setOpponent } = useRaceStore.getState();

  return (
    <Panel title="賽前設定" className={styles.setup}>
      <fieldset disabled={locked} className={styles.fieldset}>
        <section>
          <h3>賽程</h3>
          <div className={styles.chips}>
            {DISTANCE_PRESETS_M.map((m) => (
              <button
                key={m}
                type="button"
                className={distanceM === m ? styles.chipActive : styles.chip}
                onClick={() => setDistance(m)}
              >
                {m} m
              </button>
            ))}
            <label className={styles.custom}>
              自訂
              <input
                type="number"
                min={50}
                max={3000}
                step={10}
                value={distanceM}
                onChange={(e) => setDistance(Number(e.target.value) || distanceM)}
                aria-label="自訂賽程（公尺）"
                data-testid="race-distance"
              />
              m
            </label>
          </div>
          <label className={styles.row}>
            起跑燈
            <select
              value={treeMode}
              onChange={(e) => setTreeMode(e.target.value as typeof treeMode)}
            >
              <option value="sportsman">業餘（黃燈逐一亮，0.5 秒間隔）</option>
              <option value="pro">職業（黃燈齊亮，0.4 秒後綠燈）</option>
            </select>
          </label>
        </section>

        <section>
          <h3>你的車</h3>
          <p className={styles.mine}>
            {playerBike.brand} {playerBike.model}
            <small>（使用模擬器目前的改裝設定）</small>
          </p>
          <button type="button" className={styles.link} onClick={() => setMode('simulator')}>
            去模擬器換車 / 改裝 →
          </button>
        </section>

        <section>
          <h3>對手</h3>
          <label className={styles.row}>
            車款
            <select
              value={opponent.bikeId}
              onChange={(e) => setOpponent({ bikeId: e.target.value })}
              data-testid="opponent-bike"
            >
              {catalog.map((k) =>
                k.groups.map((g) => (
                  <optgroup key={`${k.kind}-${g.licenseClass}`} label={`${k.label}・${g.label}`}>
                    {g.bikes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </optgroup>
                )),
              )}
            </select>
          </label>
          <label className={styles.row}>
            改裝
            <select
              value={opponent.tuneLevel}
              onChange={(e) => setOpponent({ tuneLevel: e.target.value as TuneLevel })}
              data-testid="opponent-tune"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {TUNE_LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.row}>
            騎士
            <select
              value={opponent.skill}
              onChange={(e) => setOpponent({ skill: e.target.value as RiderSkill })}
              data-testid="opponent-skill"
            >
              {SKILLS.map((s) => (
                <option key={s} value={s}>
                  {SKILL_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.row}>
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
        </section>
      </fieldset>
      {locked && <p className={styles.lockedNote}>比賽進行中無法更改設定，按 R 回到起跑線。</p>}
    </Panel>
  );
}

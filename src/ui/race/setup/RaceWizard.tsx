import {
  RACE_STEP_LABELS,
  RACE_STEPS,
  useVenue,
  useConfigStore,
  useCurrentBike,
  useRaceStore,
  type RaceStep,
} from '@/application';
import { ModeTabs } from '../../components/common/ModeTabs';
import { SoundToggle } from '../../components/common/SoundToggle';
import { AppLayout } from '../../layouts/AppLayout';
import { BikeGrid } from './BikeGrid';
import { StepCircuit } from './StepCircuit';
import { StepOpponent } from './StepOpponent';
import { StepTrack } from './StepTrack';
import { StepTune } from './StepTune';
import styles from './setup.module.css';

const SETUP_STEPS = RACE_STEPS.filter((s) => s !== 'race');

const HEADINGS: Record<Exclude<RaceStep, 'race'>, string> = {
  track: '選擇賽道',
  bike: '選擇你的機車',
  tune: '改裝配備',
  opponent: '挑選對手',
};

function StepBike() {
  const bike = useCurrentBike();
  const selectBike = useConfigStore((s) => s.selectBike);
  return <BikeGrid selectedId={bike.id} onSelect={selectBike} testIdPrefix="bike-card" />;
}

/** Garage flow before a race: track → bike → tune → opponent → race. */
export function RaceWizard() {
  const step = useRaceStore((s) => s.step);
  const setStep = useRaceStore((s) => s.setStep);
  const venue = useVenue();
  const discipline = useRaceStore((s) => s.discipline);
  const setDiscipline = useRaceStore((s) => s.setDiscipline);
  const bike = useCurrentBike();
  const index = SETUP_STEPS.indexOf(step as (typeof SETUP_STEPS)[number]);
  const current = SETUP_STEPS[Math.max(0, index)] ?? 'track';
  const next = RACE_STEPS[RACE_STEPS.indexOf(current) + 1] ?? 'race';
  const prev = SETUP_STEPS[index - 1];

  return (
    <AppLayout
      toolbar={
        <>
          <ModeTabs />
          <SoundToggle />
        </>
      }
    >
      <nav className={styles.stepper} aria-label="賽前步驟">
        {RACE_STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            className={
              s === current ? styles.stepActive : i < index ? styles.stepDone : styles.step
            }
            aria-current={s === current ? 'step' : undefined}
            disabled={i > index}
            onClick={() => setStep(s)}
          >
            <span className={styles.stepNo}>{i + 1}</span>
            {RACE_STEP_LABELS[s]}
          </button>
        ))}
      </nav>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>{HEADINGS[current]}</h2>
          <p className={styles.summary}>
            {venue.name}・{venue.detail} · {bike.brand} {bike.model}
          </p>
        </header>
        {current === 'track' && (
          <>
            <div className={styles.disciplines} role="radiogroup" aria-label="賽事類型">
              {(['drag', 'circuit'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={discipline === d}
                  className={discipline === d ? styles.disciplineActive : styles.discipline}
                  onClick={() => setDiscipline(d)}
                  data-testid={`discipline-${d}`}
                >
                  {d === 'drag' ? '直線加速' : '賽道繞圈'}
                </button>
              ))}
            </div>
            {discipline === 'drag' ? <StepTrack /> : <StepCircuit />}
          </>
        )}
        {current === 'bike' && <StepBike />}
        {current === 'tune' && <StepTune />}
        {current === 'opponent' && <StepOpponent />}
      </section>

      <footer className={styles.footer}>
        {prev ? (
          <button type="button" className={styles.back} onClick={() => setStep(prev)}>
            ← 上一步
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={next === 'race' ? styles.go : styles.next}
          onClick={() => setStep(next)}
          data-testid="wizard-next"
        >
          {next === 'race' ? '進入比賽 🏁' : `下一步：${RACE_STEP_LABELS[next]} →`}
        </button>
      </footer>
    </AppLayout>
  );
}

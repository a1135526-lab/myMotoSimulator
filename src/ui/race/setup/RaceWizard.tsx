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
  mode: '選擇比賽模式',
  track: '選擇賽道',
  bike: '選擇你的機車',
  tune: '改裝配備',
  opponent: '挑選對手',
};

const MODES = [
  {
    id: 'drag',
    title: '直線加速賽',
    blurb: '和一位對手比直線，看燈號起跑，比反應、起步和換檔。',
    meta: '201 m／402 m／1 km 或自訂',
  },
  {
    id: 'circuit',
    title: '賽道繞圈',
    blurb: '和 1～3 位 AI 跑多圈，壓車過彎、晚煞車、煞車甩尾。',
    meta: '3 條原創賽道・MotoGP 式起跑',
  },
] as const;

/** First step: which kind of race. Picking one moves straight on to the venue. */
function StepMode() {
  const discipline = useRaceStore((s) => s.discipline);
  const setDiscipline = useRaceStore((s) => s.setDiscipline);
  const setStep = useRaceStore((s) => s.setStep);
  return (
    <div className={styles.modeGrid} role="radiogroup" aria-label="比賽模式">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={discipline === m.id}
          className={discipline === m.id ? styles.modeCardActive : styles.modeCard}
          onClick={() => {
            setDiscipline(m.id);
            setStep('track');
          }}
          data-testid={`discipline-${m.id}`}
        >
          <span className={styles.modeIcon} aria-hidden>
            {m.id === 'drag' ? '🚦' : '🏁'}
          </span>
          <strong className={styles.modeTitle}>{m.title}</strong>
          <span className={styles.modeBlurb}>{m.blurb}</span>
          <small className={styles.modeMeta}>{m.meta}</small>
        </button>
      ))}
    </div>
  );
}

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
  const bike = useCurrentBike();
  const index = SETUP_STEPS.indexOf(step as (typeof SETUP_STEPS)[number]);
  const current = SETUP_STEPS[Math.max(0, index)] ?? 'mode';
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
        {current === 'mode' && <StepMode />}
        {current === 'track' && (discipline === 'drag' ? <StepTrack /> : <StepCircuit />)}
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

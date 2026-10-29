import {
  readRaceSound,
  useActiveTrack,
  useCurrentBike,
  useRaceController,
  useRaceStore,
} from '@/application';
import { useEngineAudio } from '../audio/useEngineAudio';
import { ModeTabs } from '../components/common/ModeTabs';
import { SoundToggle } from '../components/common/SoundToggle';
import { KeyHints } from '../components/controls/KeyHints';
import { TouchControls } from '../components/controls/TouchControls';
import { AppLayout } from '../layouts/AppLayout';
import { RaceHud } from './RaceHud';
import { RaceResultCard } from './RaceResultCard';
import { RaceScene } from './RaceScene';
import styles from './race.module.css';

export function RacePage() {
  const controller = useRaceController();
  const view = useRaceStore((s) => s.view);
  const setStep = useRaceStore((s) => s.setStep);
  const bike = useCurrentBike();
  const { track, distanceM } = useActiveTrack();
  const manual = bike.kind === 'manual';
  const live = view?.phase === 'countdown' || view?.phase === 'racing';
  useEngineAudio(readRaceSound);

  const theme = {
    sky: track.sky,
    scenery: track.scenery,
    rain: track.rain,
    gradePercent: track.environment.gradePercent,
  };

  return (
    <AppLayout
      toolbar={
        <>
          <ModeTabs />
          <SoundToggle />
          <KeyHints manual={manual} spaceLabel="起跑 / 再比" />
        </>
      }
    >
      <div className={styles.raceBar}>
        <button
          type="button"
          className={styles.garageButton}
          onClick={() => setStep('tune')}
          disabled={live}
          data-testid="back-to-garage"
        >
          ← 返回車庫
        </button>
        <p className={styles.raceTitle}>
          {track.rain ? '🌧 ' : ''}
          {track.name}・{distanceM} m · {bike.brand} {bike.model} vs {view?.opponent.label ?? ''}
        </p>
      </div>
      <div className={styles.stage}>
        <RaceScene theme={theme} />
        {view && <RaceHud view={view} />}
        {view?.result && (
          <RaceResultCard
            view={view}
            onRematch={() => controller.go()}
            onGarage={() => setStep('tune')}
          />
        )}
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.goButton}
          onClick={() => controller.go()}
          disabled={live}
          data-testid="race-go"
        >
          {view?.phase === 'finished' ? '回起跑線' : '開始倒數'}
        </button>
        <TouchControls
          manual={manual}
          onPress={(c) => controller.touch.press(c)}
          onRelease={(c) => controller.touch.release(c)}
          onReset={() => controller.restage()}
          onShift={(d) => controller.shift(d)}
          onStart={() => controller.startEngine()}
        />
      </div>
    </AppLayout>
  );
}

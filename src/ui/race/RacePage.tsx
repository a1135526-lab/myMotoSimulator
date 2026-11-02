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
import { FullscreenButton, RotateHint } from '../components/controls/StageButtons';
import { TouchControls } from '../components/controls/TouchControls';
import { AppLayout } from '../layouts/AppLayout';
import { useImmersive } from '../layouts/useMediaQuery';
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
  const immersive = useImmersive();
  // Full screen, the start button sits mid-picture: only while it can be pressed
  // and the result card (with its own rematch button) isn't up.
  const showGo = !immersive || (!live && !view?.result);
  useEngineAudio(readRaceSound);

  const theme = {
    sky: track.sky,
    scenery: track.scenery,
    rain: track.rain,
    gradePercent: track.environment.gradePercent,
  };

  return (
    <AppLayout
      immersive={immersive}
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
          {immersive ? '←' : '← 返回車庫'}
        </button>
        <FullscreenButton className={styles.garageButton} />
        <p className={styles.raceTitle}>
          {track.rain ? '🌧 ' : ''}
          {track.name}・{distanceM} m · {bike.brand} {bike.model} vs {view?.opponent.label ?? ''}
        </p>
      </div>
      <RotateHint />
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
        {showGo && (
          <button
            type="button"
            className={styles.goButton}
            onClick={() => controller.go()}
            disabled={live}
            data-testid="race-go"
          >
            {view?.phase === 'finished' ? '回起跑線' : '開始倒數'}
          </button>
        )}
        <TouchControls
          manual={manual}
          overlay={immersive}
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

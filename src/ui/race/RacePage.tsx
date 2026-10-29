import { useCurrentBike, useRaceController, useRaceStore } from '@/application';
import { ModeTabs } from '../components/common/ModeTabs';
import { KeyHints } from '../components/controls/KeyHints';
import { TouchControls } from '../components/controls/TouchControls';
import { AppLayout } from '../layouts/AppLayout';
import { RaceHud } from './RaceHud';
import { RaceResultCard } from './RaceResultCard';
import { RaceScene } from './RaceScene';
import { RaceSetupPanel } from './RaceSetupPanel';
import styles from './race.module.css';

export function RacePage() {
  const controller = useRaceController();
  const view = useRaceStore((s) => s.view);
  const manual = useCurrentBike().kind === 'manual';
  const live = view?.phase === 'countdown' || view?.phase === 'racing';

  return (
    <AppLayout
      toolbar={
        <>
          <ModeTabs />
          <KeyHints manual={manual} spaceLabel="起跑 / 再比" />
        </>
      }
    >
      <div className={styles.stage}>
        <RaceScene />
        {view && <RaceHud view={view} />}
        {view?.result && <RaceResultCard view={view} onRematch={() => controller.go()} />}
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
      <RaceSetupPanel locked={live} />
    </AppLayout>
  );
}

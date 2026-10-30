import {
  cityMap,
  readStreetSound,
  useCurrentBike,
  useStreetController,
  useStreetStore,
} from '@/application';
import { useEngineAudio } from '../audio/useEngineAudio';
import { ModeTabs } from '../components/common/ModeTabs';
import { SoundToggle } from '../components/common/SoundToggle';
import { KeyHints } from '../components/controls/KeyHints';
import { TouchControls } from '../components/controls/TouchControls';
import { AppLayout } from '../layouts/AppLayout';
import race from '../race/race.module.css';
import { StreetHud } from './StreetHud';
import { StreetScene } from './StreetScene';

const STREET_KEYS: [string, string][] = [
  ['↑', '油門'],
  ['↓', '煞車'],
  ['← →', '壓車轉向'],
  ['↓ + ← →', '煞車甩尾'],
  ['E / Q', '升 / 降檔'],
  ['Shift', '離合'],
  ['Enter', '發動'],
  ['V', '視角'],
  ['R', '回到道路'],
];

export function StreetPage() {
  const controller = useStreetController();
  const view = useStreetStore((s) => s.view);
  const camera = useStreetStore((s) => s.camera);
  const timeOfDay = useStreetStore((s) => s.timeOfDay);
  const autoShift = useStreetStore((s) => s.autoShift);
  const toggleCamera = useStreetStore((s) => s.toggleCamera);
  const setStage = useStreetStore((s) => s.setStage);
  const bike = useCurrentBike();
  const manual = bike.kind === 'manual';
  useEngineAudio(readStreetSound);

  return (
    <AppLayout
      toolbar={
        <>
          <ModeTabs />
          <SoundToggle />
          <KeyHints manual={manual} hints={STREET_KEYS} />
        </>
      }
    >
      <div className={race.raceBar}>
        <button
          type="button"
          className={race.garageButton}
          onClick={() => setStage('setup')}
          data-testid="street-back"
        >
          ← 換車 / 設定
        </button>
        <p className={race.raceTitle}>
          港灣市 · {bike.brand} {bike.model}
        </p>
        <button
          type="button"
          className={race.garageButton}
          onClick={toggleCamera}
          data-testid="street-camera"
        >
          {camera === 'first' ? '切到第三人稱' : '切到第一人稱'}（V）
        </button>
      </div>
      <div className={race.stage}>
        <StreetScene timeOfDay={timeOfDay} />
        {view && <StreetHud view={view} map={cityMap()} camera={camera} />}
      </div>
      <div className={race.controls}>
        <TouchControls
          manual={manual && !autoShift}
          steering
          onPress={(c) => controller.touch.press(c)}
          onRelease={(c) => controller.touch.release(c)}
          onReset={() => controller.handleAction('reset')}
          onShift={(d) => controller.handleAction(d > 0 ? 'shiftUp' : 'shiftDown')}
          onStart={() => controller.handleAction('startEngine')}
        />
      </div>
    </AppLayout>
  );
}

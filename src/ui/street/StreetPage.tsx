import {
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
import type { CityMap } from '@/domain';
import { AppLayout } from '../layouts/AppLayout';
import race from '../race/race.module.css';
import { StreetMapOverlay } from './map/StreetMapOverlay';
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
  ['M', '大地圖・導航'],
  ['R', '回到道路'],
];

export function StreetPage({ map }: { map: CityMap }) {
  const controller = useStreetController();
  const view = useStreetStore((s) => s.view);
  const camera = useStreetStore((s) => s.camera);
  const timeOfDay = useStreetStore((s) => s.timeOfDay);
  const autoShift = useStreetStore((s) => s.autoShift);
  const toggleCamera = useStreetStore((s) => s.toggleCamera);
  const setStage = useStreetStore((s) => s.setStage);
  const mapOpen = useStreetStore((s) => s.mapOpen);
  const setMapOpen = useStreetStore((s) => s.setMapOpen);
  const northUp = useStreetStore((s) => s.northUp);
  const toggleNorthUp = useStreetStore((s) => s.toggleNorthUp);
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
          {map.name} · {bike.brand} {bike.model}
        </p>
        <button
          type="button"
          className={race.garageButton}
          onClick={toggleCamera}
          data-testid="street-camera"
        >
          {camera === 'first' ? '切到第三人稱' : '切到第一人稱'}（V）
        </button>
        <button
          type="button"
          className={race.garageButton}
          onClick={() => setMapOpen(!mapOpen)}
          data-testid="street-open-map"
        >
          🗺 地圖・導航（M）
        </button>
      </div>
      <div className={race.stage}>
        <StreetScene map={map} timeOfDay={timeOfDay} />
        {view && (
          <StreetHud
            view={view}
            map={map}
            camera={camera}
            northUp={northUp}
            onOpenMap={() => setMapOpen(true)}
            onToggleNorth={toggleNorthUp}
            onCancelNav={() => controller.clearDestination()}
          />
        )}
        {view && mapOpen && (
          <StreetMapOverlay map={map} view={view} onClose={() => setMapOpen(false)} />
        )}
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

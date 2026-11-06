import {
  readStreetSound,
  useCurrentBike,
  useStreetController,
  useStreetStore,
} from '@/application';
import { useEngineAudio } from '../audio/useEngineAudio';
import { HomeButton } from '../components/common/HomeButton';
import { SoundToggle } from '../components/common/SoundToggle';
import { KeyHints } from '../components/controls/KeyHints';
import {
  FlickShiftToggle,
  FullscreenButton,
  LayoutEditButton,
  RotateHint,
  TiltToggle,
} from '../components/controls/StageButtons';
import { TouchControls } from '../components/controls/TouchControls';
import { MirrorToggle } from '../components/hud/RearMirrorSlot';
import type { CityMap } from '@/domain';
import { AppLayout } from '../layouts/AppLayout';
import { useImmersive } from '../layouts/useMediaQuery';
import race from '../race/race.module.css';
import { StreetMapOverlay } from './map/StreetMapOverlay';
import { MissionPanel } from './missions/MissionPanel';
import { MissionResultCard } from './missions/MissionResultCard';
import { StreetHud } from './StreetHud';
import { StreetScene } from './StreetScene';

const STREET_KEYS: [string, string][] = [
  ['↑', '油門'],
  ['↓', '煞車'],
  ['← →', '壓車轉向'],
  ['↓ + ← →', '煞車甩尾'],
  ['X（停車時按住）', '倒車'],
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
  const setMissionsOpen = useStreetStore((s) => s.setMissionsOpen);
  const northUp = useStreetStore((s) => s.northUp);
  const toggleNorthUp = useStreetStore((s) => s.toggleNorthUp);
  const bike = useCurrentBike();
  const manual = bike.kind === 'manual';
  const immersive = useImmersive();
  useEngineAudio(readStreetSound);

  return (
    <AppLayout
      immersive={immersive}
      toolbar={
        <>
          <HomeButton />
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
          {immersive ? '←' : '← 換車 / 設定'}
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
          {immersive ? '👁' : `${camera === 'first' ? '切到第三人稱' : '切到第一人稱'}（V）`}
        </button>
        <button
          type="button"
          className={race.garageButton}
          onClick={() => setMapOpen(!mapOpen)}
          data-testid="street-open-map"
        >
          {immersive ? '🗺' : '🗺 地圖・導航（M）'}
        </button>
        <button
          type="button"
          className={race.garageButton}
          onClick={() => setMissionsOpen(true)}
          aria-label="街景任務"
          data-testid="street-missions"
        >
          {immersive ? '🏁' : '🏁 任務'}
        </button>
        <MirrorToggle className={race.garageButton} compact={immersive} />
        <TiltToggle className={race.garageButton} compact={immersive} />
        {manual && !autoShift && (
          <FlickShiftToggle className={race.garageButton} compact={immersive} />
        )}
        <FullscreenButton className={race.garageButton} />
        {immersive && <LayoutEditButton className={race.garageButton} />}
      </div>
      <RotateHint />
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
        <MissionPanel map={map} />
        <MissionResultCard map={map} />
      </div>
      <div className={race.controls}>
        <TouchControls
          manual={manual && !autoShift}
          steering
          reverse
          overlay={immersive}
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

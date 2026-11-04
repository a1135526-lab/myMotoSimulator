import {
  readCircuitSound,
  useActiveCircuit,
  useCircuitController,
  useCircuitStore,
  useCurrentBike,
  useCircuits,
  useRaceStore,
  useRankedStore,
  useRoomStore,
  useUiStore,
} from '@/application';
import { useEngineAudio } from '../../audio/useEngineAudio';
import { HomeButton } from '../../components/common/HomeButton';
import { SoundToggle } from '../../components/common/SoundToggle';
import { KeyHints } from '../../components/controls/KeyHints';
import {
  FlickShiftToggle,
  FullscreenButton,
  LayoutEditButton,
  RotateHint,
  TiltToggle,
} from '../../components/controls/StageButtons';
import { TouchControls } from '../../components/controls/TouchControls';
import { AppLayout } from '../../layouts/AppLayout';
import { useImmersive } from '../../layouts/useMediaQuery';
import { RankedResultActions } from '../ranked/RankedResultActions';
import { RoomOpponents } from '../room/RoomOpponents';
import { RoomResultActions } from '../room/RoomResultActions';
import { CircuitHud } from './CircuitHud';
import { CircuitResults } from './CircuitResults';
import { CircuitScene } from './CircuitScene';
import styles from '../race.module.css';

const CIRCUIT_KEYS: [string, string][] = [
  ['↑', '油門'],
  ['↓', '煞車'],
  ['← →', '壓車轉向'],
  ['↓ + ← →', '煞車甩尾'],
  ['E / Q', '升 / 降檔'],
  ['Shift', '離合'],
  ['V', '視角'],
  ['R', '回賽道'],
  ['Space', '起跑'],
];

/** `room`: a friend-room race (the host starts it; results go back to the room). */
export function CircuitPage({
  room = false,
  ranked = false,
}: {
  room?: boolean;
  ranked?: boolean;
}) {
  const rankedCircuitId = useRankedStore((s) => s.match?.circuitId ?? null);
  const controller = useCircuitController();
  const roomCircuitId = useRoomStore((s) => s.settings.circuitId);
  const circuits = useCircuits();
  const view = useCircuitStore((s) => s.view);
  const camera = useCircuitStore((s) => s.camera);
  const toggleCamera = useCircuitStore((s) => s.toggleCamera);
  const setStep = useRaceStore((s) => s.setStep);
  const autoShift = useRaceStore((s) => s.autoShift);
  const garageCircuit = useActiveCircuit();
  const circuitId = ranked ? rankedCircuitId : room ? roomCircuitId : null;
  const circuit = circuits.find((c) => c.id === circuitId) ?? garageCircuit;
  const ghostOn = useUiStore((s) => s.ghostOn);
  const setGhostOn = useUiStore((s) => s.setGhostOn);
  const bike = useCurrentBike();
  const manual = bike.kind === 'manual';
  const live = view?.phase === 'lights' || view?.phase === 'racing';
  const immersive = useImmersive();
  const showGo = !room && !ranked && (!immersive || (!live && view?.phase !== 'finished'));
  useEngineAudio(readCircuitSound);

  return (
    <AppLayout
      immersive={immersive}
      toolbar={
        <>
          <HomeButton />
          <SoundToggle />
          <KeyHints manual={manual} hints={CIRCUIT_KEYS} />
        </>
      }
    >
      <div className={styles.raceBar}>
        <button
          type="button"
          className={styles.garageButton}
          onClick={() =>
            ranked
              ? useRankedStore.getState().cancel()
              : room
                ? useRoomStore.getState().leave()
                : setStep('tune')
          }
          disabled={live && !room && !ranked}
          data-testid="back-to-garage"
        >
          {immersive ? '←' : ranked ? '← 離開排位' : room ? '← 離開房間' : '← 返回車庫'}
        </button>
        <p className={styles.raceTitle}>
          {circuit.name} · {view?.laps ?? '-'} 圈 · {bike.brand} {bike.model}
        </p>
        <button
          type="button"
          className={styles.garageButton}
          onClick={toggleCamera}
          data-testid="camera-toggle"
        >
          {immersive ? '👁' : `${camera === 'first' ? '切到第三人稱' : '切到第一人稱'}（V）`}
        </button>
        <button
          type="button"
          className={styles.garageButton}
          aria-pressed={ghostOn}
          aria-label="幽靈車"
          title="和自己最快的一圈一起跑"
          onClick={() => setGhostOn(!ghostOn)}
          data-testid="ghost-toggle"
        >
          {immersive ? '👻' : `👻 幽靈車 ${ghostOn ? '開' : '關'}`}
        </button>
        <TiltToggle className={styles.garageButton} compact={immersive} />
        {manual && !autoShift && (
          <FlickShiftToggle className={styles.garageButton} compact={immersive} />
        )}
        <FullscreenButton className={styles.garageButton} />
        {immersive && <LayoutEditButton className={styles.garageButton} />}
      </div>
      <RotateHint />
      <div className={styles.stage}>
        <CircuitScene theme={{ sky: circuit.sky, scenery: circuit.scenery }} />
        {view && <CircuitHud view={view} camera={camera} />}
        {view && (
          <CircuitResults
            view={view}
            circuitId={circuit.id}
            onRematch={() => controller.go()}
            onGarage={() => setStep('tune')}
            actions={ranked ? <RankedResultActions /> : room ? <RoomResultActions /> : undefined}
            extra={room || ranked ? <RoomOpponents /> : undefined}
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
            data-testid="circuit-go"
          >
            {view?.phase === 'finished' ? '回起跑格' : '開始亮燈'}
          </button>
        )}
        <TouchControls
          manual={manual && !autoShift}
          steering
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

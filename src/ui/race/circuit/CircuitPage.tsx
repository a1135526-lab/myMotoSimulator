import { useEffect } from 'react';
import {
  readCircuitSound,
  useActiveCircuit,
  useCircuitController,
  useCircuitStore,
  useCircuits,
  useFlashKey,
  useFlashStore,
  useMirrorKey,
  useRaceBike,
  useRaceStore,
  useRankedStore,
  useRoomStore,
  useUiStore,
} from '@/application';
import { useEngineAudio } from '../../audio/useEngineAudio';
import { useHorn } from '../../audio/useHorn';
import { useItemSounds } from '../../audio/useItemSounds';
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
import { FlashButton } from '../../components/flash/FlashButton';
import { FlashOverlay } from '../../components/flash/FlashOverlay';
import { HornButton } from '../../components/horn/HornButton';
import { MirrorButton } from '../../components/hud/RearMirrorSlot';
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
  ['B（按住）', '後照鏡'],
  ['H（按住）', '喇叭'],
  ['F', '閃大燈（夜間）'],
  ['R', '回賽道'],
  ['Space', '起跑'],
];

const ITEM_KEYS: [string, string][] = [...CIRCUIT_KEYS, ['Z', '使用道具']];

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
  const bike = useRaceBike();
  const manual = bike.kind === 'manual';
  const live = view?.phase === 'lights' || view?.phase === 'racing';
  // From your flag on, the results are up: no riding controls or HUD behind them.
  const done = view?.phase === 'finished' || view?.riders[0]?.finishTimeS != null;
  const itemRace = useCircuitStore((s) => s.view?.items != null);
  const immersive = useImmersive();
  useMirrorKey();
  useHorn();
  useItemSounds();
  useFlashKey();
  const night = circuit.sky === 'night';
  useEffect(() => {
    useFlashStore.getState().setNight(night);
    return () => useFlashStore.getState().setNight(false);
  }, [night]);
  const showGo = !room && !ranked && !done && (!immersive || !live);
  useEngineAudio(readCircuitSound);

  return (
    <AppLayout
      immersive={immersive}
      toolbar={
        <>
          <HomeButton />
          <SoundToggle />
          <KeyHints manual={manual} hints={itemRace ? ITEM_KEYS : CIRCUIT_KEYS} />
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
          {itemRace ? '🎁 道具賽 · ' : ''}
          {circuit.name} · {view?.laps ?? '-'} 圈 · {bike.brand} {bike.model}
        </p>
        {!done && (
          <>
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
            <HornButton className={styles.garageButton} compact={immersive} />
            <FlashButton className={styles.garageButton} compact={immersive} />
            <MirrorButton className={styles.garageButton} compact={immersive} />
            <TiltToggle className={styles.garageButton} compact={immersive} />
            {manual && !autoShift && (
              <FlickShiftToggle className={styles.garageButton} compact={immersive} />
            )}
            <FullscreenButton className={styles.garageButton} />
            {immersive && <LayoutEditButton className={styles.garageButton} />}
          </>
        )}
      </div>
      <RotateHint />
      <div className={styles.stage}>
        <CircuitScene theme={{ sky: circuit.sky, scenery: circuit.scenery }} />
        {view && !done && <CircuitHud view={view} camera={camera} />}
        {!done && <FlashOverlay />}
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
            開始亮燈
          </button>
        )}
        {!done && (
          <TouchControls
            manual={manual && !autoShift}
            steering
            overlay={immersive}
            onPress={(c) => controller.touch.press(c)}
            onRelease={(c) => controller.touch.release(c)}
            onReset={() => controller.handleAction('reset')}
            onShift={(d) => controller.handleAction(d > 0 ? 'shiftUp' : 'shiftDown')}
            onStart={() => controller.handleAction('startEngine')}
            onItem={itemRace ? () => controller.fireItem() : undefined}
          />
        )}
      </div>
    </AppLayout>
  );
}

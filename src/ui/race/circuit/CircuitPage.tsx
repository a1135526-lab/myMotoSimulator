import {
  readCircuitSound,
  useActiveCircuit,
  useCircuitController,
  useCircuitStore,
  useCurrentBike,
  useRaceStore,
} from '@/application';
import { useEngineAudio } from '../../audio/useEngineAudio';
import { ModeTabs } from '../../components/common/ModeTabs';
import { SoundToggle } from '../../components/common/SoundToggle';
import { KeyHints } from '../../components/controls/KeyHints';
import { TouchControls } from '../../components/controls/TouchControls';
import { AppLayout } from '../../layouts/AppLayout';
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

export function CircuitPage() {
  const controller = useCircuitController();
  const view = useCircuitStore((s) => s.view);
  const camera = useCircuitStore((s) => s.camera);
  const toggleCamera = useCircuitStore((s) => s.toggleCamera);
  const setStep = useRaceStore((s) => s.setStep);
  const autoShift = useRaceStore((s) => s.autoShift);
  const circuit = useActiveCircuit();
  const bike = useCurrentBike();
  const manual = bike.kind === 'manual';
  const live = view?.phase === 'lights' || view?.phase === 'racing';
  useEngineAudio(readCircuitSound);

  return (
    <AppLayout
      toolbar={
        <>
          <ModeTabs />
          <SoundToggle />
          <KeyHints manual={manual} hints={CIRCUIT_KEYS} />
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
          {circuit.name} · {view?.laps ?? '-'} 圈 · {bike.brand} {bike.model}
        </p>
        <button
          type="button"
          className={styles.garageButton}
          onClick={toggleCamera}
          data-testid="camera-toggle"
        >
          {camera === 'first' ? '切到第三人稱' : '切到第一人稱'}（V）
        </button>
      </div>
      <div className={styles.stage}>
        <CircuitScene theme={{ sky: circuit.sky, scenery: circuit.scenery }} />
        {view && <CircuitHud view={view} camera={camera} />}
        {view && (
          <CircuitResults
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
          data-testid="circuit-go"
        >
          {view?.phase === 'finished' ? '回起跑格' : '開始亮燈'}
        </button>
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

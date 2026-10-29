import {
  useCurrentBike,
  useGaugeScale,
  useSimulationController,
  useTelemetry,
  useTimerView,
} from '@/application';
import { ModeTabs } from '../components/common/ModeTabs';
import { Panel } from '../components/common/Panel';
import { BikeSelector } from '../components/config/BikeSelector';
import { PartsPanel } from '../components/config/PartsPanel';
import { SpecSheet } from '../components/config/SpecSheet';
import { KeyHints } from '../components/controls/KeyHints';
import { TouchControls } from '../components/controls/TouchControls';
import { DynoPanel } from '../components/dyno/DynoPanel';
import { Speedometer } from '../components/gauges/Speedometer';
import { Tachometer } from '../components/gauges/Tachometer';
import { LiveDataPanel } from '../components/telemetry/LiveDataPanel';
import { TimerPanel } from '../components/telemetry/TimerPanel';
import { AppLayout } from '../layouts/AppLayout';
import styles from './SimulatorPage.module.css';

export function SimulatorPage() {
  const controller = useSimulationController();
  const telemetry = useTelemetry();
  const timer = useTimerView();
  const scale = useGaugeScale();
  const manual = useCurrentBike().kind === 'manual';
  const stalled = telemetry !== null && !telemetry.engineRunning;

  return (
    <AppLayout
      toolbar={
        <>
          <ModeTabs />
          <BikeSelector />
          <KeyHints manual={manual} />
        </>
      }
    >
      <div className={styles.top}>
        <div className={styles.cockpit}>
          <Panel className={styles.gauges}>
            <Tachometer
              rpm={telemetry?.rpm ?? 0}
              maxRpm={scale.tachMaxRpm}
              redlineRpm={scale.redlineRpm}
              revLimiter={telemetry?.revLimiter ?? false}
              gearLabel={telemetry?.gearLabel ?? null}
              engineRunning={telemetry?.engineRunning ?? true}
            />
            <Speedometer speedKmh={telemetry?.speedKmh ?? 0} maxKmh={scale.speedMaxKmh} />
          </Panel>
          {stalled && (
            <p className={styles.stallBanner} role="status" data-testid="stall-banner">
              引擎熄火 — 打到空檔（或按住離合）後按 <kbd>Enter</kbd> 發動
            </p>
          )}
          {manual && telemetry?.gearLabel === 'N' && !stalled && (
            <p className={styles.tip}>
              起步：按住 <kbd>Shift</kbd> 拉離合 → <kbd>→</kbd> 入 1 檔 → 按住 <kbd>↑</kbd> 催油 →
              放開 <kbd>Shift</kbd> 慢慢吃離合
            </p>
          )}
          <div className={styles.touch}>
            <TouchControls
              manual={manual}
              onPress={(c) => controller.touch.press(c)}
              onRelease={(c) => controller.touch.release(c)}
              onReset={() => controller.reset()}
              onShift={(d) => controller.shift(d)}
              onStart={() => controller.startEngine()}
            />
          </div>
          <div className={styles.readouts}>
            {telemetry && <LiveDataPanel data={telemetry} />}
            {timer && <TimerPanel timer={timer} onToggle={() => controller.toggleTimer()} />}
          </div>
        </div>
        <aside className={styles.sidebar}>
          <PartsPanel />
        </aside>
      </div>
      <DynoPanel />
      <SpecSheet />
    </AppLayout>
  );
}

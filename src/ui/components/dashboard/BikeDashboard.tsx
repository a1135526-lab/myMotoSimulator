import type { ComponentType } from 'react';
import type { DashboardModel, DashboardReadings } from '@/application';
import { AnalogLcdCluster } from './AnalogLcdCluster';
import styles from './dashboard.module.css';
import { LcdBarCluster } from './LcdBarCluster';
import { lampState, type LayoutProps } from './lcd';
import { RoundLcdCluster } from './RoundLcdCluster';
import { TftCluster } from './TftCluster';
import { TickRingCluster } from './TickRingCluster';
import { TwinAnalogCluster } from './TwinAnalogCluster';

const LAYOUTS: Readonly<Record<DashboardModel['layout'], ComponentType<LayoutProps>>> = {
  'lcd-bar': LcdBarCluster,
  'round-lcd': RoundLcdCluster,
  'analog-lcd': AnalogLcdCluster,
  'twin-analog': TwinAnalogCluster,
  tft: TftCluster,
  'tick-ring': TickRingCluster,
};

interface BikeDashboardProps {
  readonly model: DashboardModel;
  readonly readings: DashboardReadings;
  /** Test ids for the speed / gear readouts, so each page keeps its own. */
  readonly speedTestId?: string;
  readonly gearTestId?: string;
  readonly className?: string;
}

/** The bike's own instrument cluster, drawn to look like the real one. */
export function BikeDashboard({
  model,
  readings,
  speedTestId,
  gearTestId,
  className,
}: BikeDashboardProps) {
  const Layout = LAYOUTS[model.layout];
  const speed = Math.floor(readings.speedKmh);
  return (
    <div
      className={`${styles.dash} ${className ?? ''}`}
      role="img"
      aria-label={`儀表：時速 ${speed} 公里，轉速 ${Math.round(readings.rpm)}${
        readings.gearLabel === null ? '' : `，${readings.gearLabel} 檔`
      }`}
      data-testid="dashboard"
      data-layout={model.layout}
      data-speed={readings.speedKmh.toFixed(2)}
      data-rpm={Math.round(readings.rpm)}
    >
      <Layout m={model} r={readings} lamps={lampState(model, readings)} />
      <span className={styles.srOnly} data-testid={speedTestId}>
        {speed}
      </span>
      {readings.gearLabel !== null && (
        <span className={styles.srOnly} data-testid={gearTestId}>
          {readings.gearLabel}
        </span>
      )}
    </div>
  );
}

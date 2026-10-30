import type { DashboardModel, DashboardReadings } from '@/application';
import { BikeDashboard } from '../../../components/dashboard/BikeDashboard';
import styles from './hud.module.css';

interface ClusterProps {
  readonly dash: DashboardModel;
  readonly readings: DashboardReadings;
  readonly throttle: number;
  readonly brake: number;
}

/** The bike's own dash, with throttle / brake bars beside it. */
export function Cluster({ dash, readings, throttle, brake }: ClusterProps) {
  return (
    <div className={styles.cluster}>
      <div className={styles.pedals} aria-hidden>
        <span className={styles.pedalBrake} style={{ height: `${brake * 100}%` }} />
        <span className={styles.pedalThrottle} style={{ height: `${throttle * 100}%` }} />
      </div>
      <div className={styles.dashSlot} data-layout={dash.layout}>
        <BikeDashboard
          model={dash}
          readings={readings}
          speedTestId="circuit-speed"
          gearTestId="circuit-gear"
        />
      </div>
    </div>
  );
}

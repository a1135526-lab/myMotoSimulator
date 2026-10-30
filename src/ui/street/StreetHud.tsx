import type { CameraMode, StreetView } from '@/application';
import type { CityMap } from '@/domain';
import { BikeDashboard } from '../components/dashboard/BikeDashboard';
import { NavCard } from './NavCard';
import { StreetMinimap } from './StreetMinimap';
import styles from './street.module.css';

const RAD_TO_DEG = 180 / Math.PI;

function alertFor(view: StreetView): { text: string; tone: 'info' | 'warn' | 'danger' } | null {
  const r = view.rider;
  if (r.crashed) return { text: '摔車了！馬上把你放回最近的道路', tone: 'danger' };
  if (!r.engineRunning) return { text: '熄火 · 空檔或拉離合後按 Enter 發動', tone: 'warn' };
  if (r.offRoad && r.speedKmh > 5) return { text: '騎上人行道了，小心行人', tone: 'warn' };
  return null;
}

const clock = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export interface StreetHudProps {
  view: StreetView;
  map: CityMap;
  camera: CameraMode;
  northUp?: boolean;
  onOpenMap?: () => void;
  onToggleNorth?: () => void;
  onCancelNav?: () => void;
}

export function StreetHud({
  view,
  map,
  camera,
  northUp = false,
  onOpenMap = () => undefined,
  onToggleNorth = () => undefined,
  onCancelNav = () => undefined,
}: StreetHudProps) {
  const r = view.rider;
  const alert = alertFor(view);
  const lean = Math.round(Math.abs(r.lean) * RAD_TO_DEG);
  const { place } = view;
  return (
    <div className={styles.hud}>
      <div className={styles.topLeft}>
        <p className={styles.city}>{view.cityName}</p>
        <p className={styles.district} data-testid="street-district">
          {place.village ?? place.suburb ?? view.cityName}
        </p>
        {place.suburb && <p className={styles.place}>{place.suburb}</p>}
        <p className={styles.clock}>{clock()}</p>
      </div>

      {view.nav && <NavCard nav={view.nav} onCancel={onCancelNav} />}
      {alert && (
        <p
          className={styles.alert}
          data-tone={alert.tone}
          data-testid="street-alert"
          style={view.nav ? { top: 130 } : undefined}
        >
          {alert.text}
        </p>
      )}

      <div className={styles.topRight}>
        <StreetMinimap
          map={map}
          view={view}
          northUp={northUp}
          onOpen={onOpenMap}
          onToggleNorth={onToggleNorth}
        />
      </div>

      <div className={styles.bottomLeft}>
        <dl className={styles.stats}>
          <div>
            <dt>本次里程</dt>
            <dd data-testid="street-trip">{view.tripKm.toFixed(2)} km</dd>
          </div>
          <div>
            <dt>極速</dt>
            <dd>{Math.round(view.topSpeedKmh)} km/h</dd>
          </div>
          <div>
            <dt>壓車</dt>
            <dd>
              {r.lean > 0.02 ? 'L' : r.lean < -0.02 ? 'R' : ''}
              {lean}°
            </dd>
          </div>
        </dl>
        <span className={styles.camera}>
          {camera === 'first' ? '第一人稱' : '第三人稱'} <kbd>V</kbd> · 地圖 <kbd>M</kbd>
        </span>
      </div>

      <div className={styles.bottomRight}>
        <div className={styles.dashSlot} data-layout={view.dash.layout}>
          <BikeDashboard
            model={view.dash}
            readings={{
              speedKmh: r.speedKmh,
              rpm: r.rpm,
              gearLabel: r.gearLabel,
              engineRunning: r.engineRunning,
              revLimiter: r.revLimiter,
              tripKm: view.tripKm,
            }}
            speedTestId="street-speed"
            gearTestId="street-gear"
          />
        </div>
      </div>
    </div>
  );
}

import {
  DRIFT_SLIP_RAD,
  mpsToKmh,
  nextStep,
  placeAt,
  type CarKind,
  type CityMap,
  type ManeuverKind,
  type PlaceName,
  type Route,
  type SimModel,
  type StreetState,
} from '@/domain';
import { maneuverText } from '../street/places';
import { dashboardModel, type DashboardModel } from './dashboard';
import { gearLabelOf } from './telemetry';

export interface StreetCarView {
  readonly id: number;
  readonly kind: CarKind;
  readonly paint: number;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly speedKmh: number;
}

export interface StreetRiderView {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  /** Lean, rad (+ = left). */
  readonly lean: number;
  /** Body slip angle in a brake slide, rad. */
  readonly slip: number;
  /** Slide 0–1, for tyre smoke. */
  readonly drift: number;
  readonly speedKmh: number;
  readonly rpm: number;
  readonly throttle: number;
  readonly brake: number;
  readonly gearLabel: string | null;
  readonly engineRunning: boolean;
  readonly revLimiter: boolean;
  readonly crashed: boolean;
  readonly offRoad: boolean;
  readonly manual: boolean;
  readonly cylinders: number;
  readonly distanceM: number;
}

export interface NavView {
  readonly label: string;
  readonly destination: { readonly x: number; readonly z: number };
  /** Same object until the route is re-planned, so drawings can be cached. */
  readonly route: Route;
  readonly next: {
    readonly kind: ManeuverKind;
    readonly text: string;
    readonly distanceM: number;
    readonly x: number;
    readonly z: number;
  };
  readonly remainingM: number;
  /** At typical town speed, or faster if the rider is. */
  readonly etaS: number;
  readonly arrived: boolean;
}

export interface StreetView {
  readonly clockS: number;
  readonly rider: StreetRiderView;
  readonly cars: readonly StreetCarView[];
  readonly place: PlaceName;
  readonly cityName: string;
  readonly attribution: string;
  readonly nav: NavView | null;
  readonly tripKm: number;
  readonly topSpeedKmh: number;
  readonly dash: DashboardModel;
}

/** Average town riding speed for arrival estimates, m/s (≈ 30 km/h). */
const TOWN_MPS = 8.3;

function navView(state: StreetState): NavView | null {
  const nav = state.nav;
  if (!nav) return null;
  const step = nextStep(nav);
  const m = step.maneuver;
  return {
    label: nav.destination.label,
    destination: { x: nav.destination.x, z: nav.destination.z },
    route: nav.route,
    next: {
      kind: m.kind,
      text: maneuverText(m.kind, m.road),
      distanceM: step.distanceM,
      x: m.x,
      z: m.z,
    },
    remainingM: step.remainingM,
    etaS: step.remainingM / Math.max(TOWN_MPS, state.rider.sim.speedMps),
    arrived: nav.arrived,
  };
}

export function toStreetView(state: StreetState, model: SimModel, map: CityMap): StreetView {
  const r = state.rider;
  const bike = model.config.bike;
  return {
    clockS: state.clockS,
    rider: {
      x: r.x,
      z: r.z,
      heading: r.heading,
      lean: r.lean,
      slip: r.drift * DRIFT_SLIP_RAD,
      drift: Math.abs(r.drift),
      speedKmh: mpsToKmh(r.sim.speedMps),
      rpm: r.sim.engineRpm,
      throttle: r.sim.throttle,
      brake: r.sim.brake,
      gearLabel: gearLabelOf(r.sim.gear),
      engineRunning: r.sim.engineRunning,
      revLimiter: r.sim.revLimiterActive,
      crashed: r.crashedUntilS !== null,
      offRoad: r.surface !== 'road',
      manual: bike.kind === 'manual',
      cylinders: bike.engine.cylinders,
      distanceM: r.distanceM,
    },
    cars: state.traffic.cars.map((c) => ({
      id: c.id,
      kind: c.kind,
      paint: c.paint,
      x: c.x,
      z: c.z,
      heading: c.heading,
      speedKmh: mpsToKmh(c.speedMps),
    })),
    place: placeAt(map, r.x, r.z),
    cityName: map.name,
    attribution: map.attribution,
    nav: navView(state),
    tripKm: r.distanceM / 1000,
    topSpeedKmh: r.topSpeedKmh,
    dash: dashboardModel(bike, model.engine.revLimitRpm),
  };
}

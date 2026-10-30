import {
  districtAt,
  DRIFT_SLIP_RAD,
  mpsToKmh,
  type CarKind,
  type CityMap,
  type SimModel,
  type StreetState,
} from '@/domain';
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

export interface StreetView {
  readonly clockS: number;
  readonly rider: StreetRiderView;
  readonly cars: readonly StreetCarView[];
  readonly district: string;
  readonly cityName: string;
  readonly tripKm: number;
  readonly topSpeedKmh: number;
  readonly dash: DashboardModel;
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
    district: map.spec.districtNames[districtAt(map, r.x, r.z)],
    cityName: map.spec.name,
    tripKm: r.distanceM / 1000,
    topSpeedKmh: r.topSpeedKmh,
    dash: dashboardModel(bike, model.engine.revLimitRpm),
  };
}

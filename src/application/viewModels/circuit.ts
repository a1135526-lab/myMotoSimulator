import {
  DRIFT_SLIP_RAD,
  litLights,
  mpsToKmh,
  toWorld,
  type CircuitGeometry,
  type CircuitPhase,
  type CircuitRaceState,
  type CircuitRider,
  type SimModel,
} from '@/domain';
import { dashboardModel, type DashboardModel } from './dashboard';
import { gearLabelOf } from './telemetry';

const PERCENT = 100;
const RAD_TO_DEG = 180 / Math.PI;

export interface CircuitRiderView {
  readonly name: string;
  readonly isPlayer: boolean;
  readonly manual: boolean;
  readonly cylinders: number;
  /** World position on the ground plane and heading of travel. */
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  /** Lean, rad (+ = left). */
  readonly lean: number;
  /** Body slip angle in a brake slide, rad (+ = nose to the left of travel). */
  readonly slip: number;
  /** Slide intensity 0–1, for tyre smoke. */
  readonly drift: number;
  readonly speedKmh: number;
  readonly rpm: number;
  readonly redlineRpm: number;
  readonly throttle: number;
  readonly engineRunning: boolean;
  readonly revLimiter: boolean;
  readonly progressM: number;
  readonly position: number;
  readonly crashed: boolean;
  /** Race time at the flag (since lights out), null while racing. */
  readonly finishTimeS: number | null;
  readonly bestLapS: number | null;
}

export interface CircuitPlayerView {
  readonly lap: number;
  readonly currentLapS: number | null;
  readonly lastLapS: number | null;
  readonly bestLapS: number | null;
  readonly gearLabel: string | null;
  readonly leanDeg: number;
  readonly throttlePct: number;
  readonly brakePct: number;
  readonly clutchLeverPct: number;
  readonly offTrack: boolean;
  /** Slide 0–100 % while braking into a corner. */
  readonly driftPct: number;
  /** Race order gap to the rider ahead, m (null when leading). */
  readonly gapAheadM: number | null;
  /** Lights out → the player's launch, s (negative = went early); null until they go. */
  readonly reactionS: number | null;
  readonly jumpStart: boolean;
  /** Seconds left on a jump-start hold (null when not serving one). */
  readonly penaltyLeftS: number | null;
}

export interface CircuitView {
  readonly phase: CircuitPhase;
  readonly lightsLit: number;
  /** Seconds since the lights went out (negative before). */
  readonly raceTimeS: number;
  readonly laps: number;
  readonly geo: CircuitGeometry;
  readonly runoffM: number;
  readonly riders: readonly CircuitRiderView[];
  readonly player: CircuitPlayerView;
  /** The player's instrument cluster. */
  readonly dash: DashboardModel;
}

const best = (laps: readonly number[]) => (laps.length ? Math.min(...laps) : null);

/** Finished riders by finish time, then everyone else by distance covered. */
function positions(riders: readonly CircuitRider[]): number[] {
  const order = riders
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const fa = a.r.finishedAtS;
      const fb = b.r.finishedAtS;
      if (fa !== null && fb !== null) return fa - fb;
      if (fa !== null) return -1;
      if (fb !== null) return 1;
      return b.r.progressM - a.r.progressM;
    });
  const pos = new Array<number>(riders.length);
  order.forEach(({ i }, rank) => (pos[i] = rank + 1));
  return pos;
}

function gapAhead(riders: readonly CircuitRider[], pos: readonly number[]): number | null {
  const me = riders[0];
  const ahead = riders.find((_, i) => pos[i] === (pos[0] ?? 1) - 1);
  return me && ahead ? Math.max(0, ahead.progressM - me.progressM) : null;
}

export function toCircuitView(
  race: CircuitRaceState,
  geo: CircuitGeometry,
  models: readonly SimModel[],
  names: readonly string[],
): CircuitView {
  const pos = positions(race.riders);
  const riders = race.riders.map((r, i): CircuitRiderView => {
    const model = models[i] as SimModel;
    const bike = model.config.bike;
    const w = toWorld(geo, r.lat.s, r.lat.d);
    return {
      name: names[i] ?? `${bike.brand} ${bike.model}`,
      isPlayer: i === 0,
      manual: bike.kind === 'manual',
      cylinders: bike.engine.cylinders,
      x: w.x,
      z: w.z,
      // ψ > 0 points left of the track, and left turns lower the heading.
      heading: w.heading - r.lat.psi,
      lean: r.lat.lean,
      slip: r.drift * DRIFT_SLIP_RAD,
      drift: Math.abs(r.drift),
      speedKmh: mpsToKmh(r.sim.speedMps),
      rpm: r.sim.engineRpm,
      redlineRpm: model.engine.revLimitRpm,
      throttle: r.input.throttle,
      engineRunning: r.sim.engineRunning,
      revLimiter: r.sim.revLimiterActive,
      progressM: r.progressM,
      position: pos[i] ?? i + 1,
      crashed: r.crashedUntilS !== null,
      finishTimeS: r.finishedAtS === null ? null : r.finishedAtS - race.lightsOutAtS,
      bestLapS: best(r.lapTimesS),
    };
  });

  const p = race.riders[0] as CircuitRider;
  return {
    phase: race.phase,
    lightsLit: litLights(race),
    raceTimeS: race.clockS - race.lightsOutAtS,
    laps: race.settings.laps,
    geo,
    runoffM: race.settings.limits.runoffM,
    riders,
    dash: dashboardModel(
      (models[0] as SimModel).config.bike,
      (models[0] as SimModel).engine.revLimitRpm,
    ),
    player: {
      lap: Math.min(race.settings.laps, Math.max(1, p.crossings)),
      currentLapS: p.lapStartedAtS === null ? null : race.clockS - p.lapStartedAtS,
      lastLapS: p.lapTimesS[p.lapTimesS.length - 1] ?? null,
      bestLapS: best(p.lapTimesS),
      gearLabel: gearLabelOf(p.sim.gear),
      leanDeg: p.lat.lean * RAD_TO_DEG,
      throttlePct: p.sim.throttle * PERCENT,
      brakePct: p.sim.brake * PERCENT,
      clutchLeverPct: p.sim.clutchLever * PERCENT,
      offTrack: p.surface !== 'track',
      driftPct: Math.abs(p.drift) * PERCENT,
      gapAheadM: gapAhead(race.riders, pos),
      reactionS: race.playerLaunchAtS === null ? null : race.playerLaunchAtS - race.lightsOutAtS,
      jumpStart: race.penaltyUntilS !== null,
      penaltyLeftS:
        race.penaltyUntilS !== null && race.clockS < race.penaltyUntilS
          ? race.penaltyUntilS - race.clockS
          : null,
    },
  };
}

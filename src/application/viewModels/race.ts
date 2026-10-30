import {
  mpsToKmh,
  raceResult,
  treeLights,
  type RaceModels,
  type RacePhase,
  type RaceResult,
  type RacerState,
  type RaceState,
  type TreeLights,
} from '@/domain';
import { dashboardModel, type DashboardModel } from './dashboard';
import { gearLabelOf } from './telemetry';

const PERCENT = 100;

export interface RacerView {
  readonly label: string;
  readonly distanceM: number;
  readonly speedKmh: number;
  readonly rpm: number;
  readonly redlineRpm: number;
  readonly gearLabel: string | null;
  readonly engineRunning: boolean;
  readonly revLimiter: boolean;
  readonly throttlePct: number;
  readonly clutchLeverPct: number;
  readonly manual: boolean;
  readonly cylinders: number;
  readonly finished: boolean;
  readonly dash: DashboardModel;
}

export interface RaceView {
  readonly phase: RacePhase;
  readonly lights: TreeLights;
  /** Red light per lane: shown once a false start is detected. */
  readonly redLights: { readonly player: boolean; readonly opponent: boolean };
  readonly distanceM: number;
  /** Seconds since green (negative before). */
  readonly raceTimeS: number;
  /** Green → the player's launch, s; null until they go. */
  readonly playerReactionS: number | null;
  readonly player: RacerView;
  readonly opponent: RacerView;
  /** + = player ahead. */
  readonly gapM: number;
  readonly result: RaceResult | null;
}

function racerView(racer: RacerState, models: RaceModels, side: keyof RaceModels): RacerView {
  const model = models[side];
  const { sim } = racer;
  const bike = model.config.bike;
  return {
    label: `${bike.brand} ${bike.model}`,
    distanceM: sim.distanceM,
    speedKmh: mpsToKmh(sim.speedMps),
    rpm: sim.engineRpm,
    redlineRpm: model.engine.revLimitRpm,
    gearLabel: gearLabelOf(sim.gear),
    engineRunning: sim.engineRunning,
    revLimiter: sim.revLimiterActive,
    throttlePct: sim.throttle * PERCENT,
    clutchLeverPct: sim.clutchLever * PERCENT,
    manual: bike.kind === 'manual',
    cylinders: bike.engine.cylinders,
    finished: racer.finishedAtS !== null,
    dash: dashboardModel(bike, model.engine.revLimitRpm),
  };
}

export function toRaceView(race: RaceState, models: RaceModels): RaceView {
  return {
    phase: race.phase,
    lights:
      race.phase === 'staged'
        ? { ambers: [false, false, false], green: false }
        : treeLights(race.tree, race.clockS),
    redLights: { player: race.player.falseStart, opponent: race.opponent.falseStart },
    distanceM: race.settings.distanceM,
    raceTimeS: race.clockS - race.tree.greenAtS,
    playerReactionS:
      race.player.launchAtS === null ? null : race.player.launchAtS - race.tree.greenAtS,
    player: racerView(race.player, models, 'player'),
    opponent: racerView(race.opponent, models, 'opponent'),
    gapM: race.player.sim.distanceM - race.opponent.sim.distanceM,
    result: race.phase === 'finished' ? raceResult(race) : null,
  };
}

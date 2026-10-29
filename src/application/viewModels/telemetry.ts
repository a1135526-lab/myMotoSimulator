import {
  mpsToKmh,
  STANDARD_GRAVITY,
  wattsToPs,
  type ClutchState,
  type SimConfig,
  type SimState,
  type TimerPhase,
  type TimerState,
} from '@/domain';

const PERCENT = 100;
const RPM_ROUND = 1000;
/** Tach dial extends this far past the rev limit. */
const TACH_HEADROOM_RPM = 1000;
const SPEEDO_MIN_MAX_KMH = 140;
const SPEEDO_STEP_KMH = 20;

export interface TelemetryView {
  readonly rpm: number;
  readonly speedKmh: number;
  readonly throttlePct: number;
  readonly brakePct: number;
  readonly gearRatio: number;
  /** "N", "1"…"6" on manual bikes; null on scooters. */
  readonly gearLabel: string | null;
  readonly clutchLeverPct: number;
  readonly engineRunning: boolean;
  readonly clutchState: ClutchState;
  readonly clutchLabel: string;
  readonly enginePs: number;
  readonly wheelPs: number;
  readonly accelG: number;
  readonly distanceM: number;
  readonly revLimiter: boolean;
}

export const CLUTCH_LABELS: Readonly<Record<ClutchState, string>> = {
  disengaged: '分離',
  slipping: '半接合',
  locked: '接合',
};

export const gearLabelOf = (gear: number | null): string | null =>
  gear === null ? null : gear === 0 ? 'N' : String(gear);

export function toTelemetryView(sim: SimState): TelemetryView {
  return {
    rpm: sim.engineRpm,
    speedKmh: mpsToKmh(sim.speedMps),
    throttlePct: sim.throttle * PERCENT,
    brakePct: sim.brake * PERCENT,
    gearRatio: sim.gearRatio,
    gearLabel: gearLabelOf(sim.gear),
    clutchLeverPct: sim.clutchLever * PERCENT,
    engineRunning: sim.engineRunning,
    clutchState: sim.clutchState,
    clutchLabel: sim.gear === 0 ? '空檔' : CLUTCH_LABELS[sim.clutchState],
    enginePs: Math.max(0, wattsToPs(sim.enginePowerW)),
    wheelPs: Math.max(0, wattsToPs(sim.wheelPowerW)),
    accelG: sim.accelerationMps2 / STANDARD_GRAVITY,
    distanceM: sim.distanceM,
    revLimiter: sim.revLimiterActive,
  };
}

export interface GaugeScale {
  readonly tachMaxRpm: number;
  readonly redlineRpm: number;
  readonly speedMaxKmh: number;
}

export function toGaugeScale(config: SimConfig): GaugeScale {
  const limit = config.tune.ecu.revLimitRpm;
  return {
    tachMaxRpm: Math.ceil((limit + TACH_HEADROOM_RPM) / RPM_ROUND) * RPM_ROUND,
    redlineRpm: limit,
    speedMaxKmh: SPEEDO_MIN_MAX_KMH,
  };
}

/** Round a top speed up to a tidy speedo scale (multiples of 20, min 140). */
export const speedoMaxFor = (topSpeedKmh: number): number =>
  Math.max(SPEEDO_MIN_MAX_KMH, Math.ceil((topSpeedKmh + 10) / SPEEDO_STEP_KMH) * SPEEDO_STEP_KMH);

export interface SplitView {
  readonly label: string;
  readonly seconds: number | undefined;
}

export interface TimerView {
  readonly phase: TimerPhase;
  readonly phaseLabel: string;
  readonly elapsedS: number;
  readonly splits: readonly SplitView[];
  readonly topSpeedKmh: number;
}

const PHASE_LABELS: Readonly<Record<TimerPhase, string>> = {
  idle: '按 Space 準備計時',
  armed: '已就緒，催油門起步',
  running: '計時中…',
  finished: '完成！按 Space 重新計時',
};

export function toTimerView(timer: TimerState): TimerView {
  const t = timer.times;
  return {
    phase: timer.phase,
    phaseLabel: PHASE_LABELS[timer.phase],
    elapsedS: timer.elapsedS,
    splits: [
      { label: '0–60 km/h', seconds: t.zeroTo60S },
      { label: '0–100 km/h', seconds: t.zeroTo100S },
      { label: '0–100 m', seconds: t.zeroTo100mS },
      { label: '0–400 m', seconds: t.zeroTo400mS },
    ],
    topSpeedKmh: t.topSpeedKmh,
  };
}

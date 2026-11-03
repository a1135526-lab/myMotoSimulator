/**
 * Street missions: ride from the station to a landmark against the clock.
 * Every run starts in the same place, so times on one mission compare.
 */

/** Typical town pace the time limit is built on, m/s (≈ 30 km/h). */
export const MISSION_TOWN_MPS = 8.3;
/** Extra time on top, s: getting going, the odd red light. */
export const MISSION_SLACK_S = 15;
/** Share of the limit for each star: three, two, one. */
export const STAR_SHARES = [0.7, 0.85, 1] as const;

export interface MissionRun {
  readonly id: string;
  /** Street clock when it started, s. */
  readonly startedAtS: number;
  readonly limitS: number;
  /** Street clock on arrival; null while riding. */
  readonly finishedAtS: number | null;
  readonly crashes: number;
}

/** The time limit for a route of this length, whole seconds. */
export const missionLimitS = (routeM: number) =>
  Math.ceil(routeM / MISSION_TOWN_MPS + MISSION_SLACK_S);

/** 3 inside 70 % of the limit, 2 inside 85 %, 1 inside it, 0 late. */
export function missionStars(timeS: number, limitS: number): 0 | 1 | 2 | 3 {
  const [three, two, one] = STAR_SHARES;
  if (timeS <= limitS * three) return 3;
  if (timeS <= limitS * two) return 2;
  if (timeS <= limitS * one) return 1;
  return 0;
}

export function startMission(id: string, clockS: number, routeM: number): MissionRun {
  return { id, startedAtS: clockS, limitS: missionLimitS(routeM), finishedAtS: null, crashes: 0 };
}

/** One step: count a fresh crash, stop the clock on arrival. */
export function stepMission(
  run: MissionRun,
  clockS: number,
  arrived: boolean,
  justCrashed: boolean,
): MissionRun {
  if (run.finishedAtS !== null) return run;
  const crashes = justCrashed ? run.crashes + 1 : run.crashes;
  if (arrived) return { ...run, crashes, finishedAtS: clockS };
  return crashes === run.crashes ? run : { ...run, crashes };
}

export const missionTimeS = (run: MissionRun, clockS: number) =>
  (run.finishedAtS ?? clockS) - run.startedAtS;

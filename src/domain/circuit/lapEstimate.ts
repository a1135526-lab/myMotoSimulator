import { engineSweep } from '../dyno/dynoRun';
import type { SimModel } from '../simulation/model';
import { DRIVETRAIN_EFFICIENCY } from '../transmission/finalDrive';
import { STANDARD_GRAVITY } from '../units';
import { aeroDragN, rollingResistanceN } from '../vehicle/dynamics';
import { speedProfile, type CircuitSkill } from './circuitAi';
import type { CircuitGeometry } from './geometry';

/**
 * Quasi-steady-state lap time — the classic quick lap simulator:
 * corner limits come from the AI speed profile; on the way out of each corner
 * the bike accelerates with  a = (min(P/v, μ·m·g) − drag − rolling) / m.
 * Microseconds instead of a full time-stepped lap, so garage cards can show
 * it for every bike. It ignores gear changes and turbo-lag-like details, so
 * treat it as a ranking, not a prediction to the tenth.
 */
const MIN_SPEED_MPS = 2;

export function estimateLapTime(
  geo: CircuitGeometry,
  model: SimModel,
  gripG: number,
  skill: CircuitSkill,
): number {
  const profile = speedProfile(geo, gripG, skill);
  const wheelPowerW = engineSweep(model).peakPower.powerW * DRIVETRAIN_EFFICIENCY;
  const { body } = model;
  const gripForce = gripG * body.massKg * STANDARD_GRAVITY;
  const n = profile.length;

  // Two laps; the second is a flying lap (no standing start).
  let v = profile[0] ?? MIN_SPEED_MPS;
  let lapTime = 0;
  for (let k = 0; k < 2 * n; k++) {
    const i = k % n;
    const limit = profile[(i + 1) % n] ?? v;
    const drive = Math.min(wheelPowerW / Math.max(v, MIN_SPEED_MPS), gripForce);
    const accel = (drive - aeroDragN(body, v) - rollingResistanceN(body)) / body.effectiveMassKg;
    const next = Math.max(
      MIN_SPEED_MPS,
      Math.min(limit, Math.sqrt(Math.max(0, v * v + 2 * accel * geo.step))),
    );
    if (k >= n) lapTime += geo.step / ((v + next) / 2);
    v = next;
  }
  return lapTime;
}

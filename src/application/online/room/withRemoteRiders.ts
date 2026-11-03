import type { CircuitRiderView, CircuitView } from '../../viewModels/circuit';
import type { RemoteRider } from './remoteRiders';
import type { RoomFinish } from './roomStore';

/** Their rev limit isn't sent; the gauge-and-sound only needs something sensible above. */
const REDLINE_MARGIN = 1.15;

/**
 * This device's race plus the other players' bikes, re-ranked together:
 * finishers by time, then everyone else by distance covered.
 */
export function withRemoteRiders(
  view: CircuitView,
  remotes: readonly RemoteRider[],
  finishes: Readonly<Record<string, RoomFinish>>,
): CircuitView {
  if (remotes.length === 0) return view;
  const taken = new Set(view.riders.map((r) => r.name));
  const added = remotes.map(({ player, pose }): CircuitRiderView => {
    let name = player.name;
    for (let n = 2; taken.has(name); n++) name = `${player.name} ${n}`;
    taken.add(name);
    const finish = finishes[player.id];
    return {
      name,
      isPlayer: false,
      manual: player.manual,
      cylinders: player.cylinders,
      x: pose.x,
      z: pose.z,
      heading: pose.heading,
      lean: pose.lean,
      slip: 0,
      drift: 0,
      speedKmh: pose.speedKmh,
      rpm: pose.rpm,
      redlineRpm: Math.max(pose.rpm * REDLINE_MARGIN, 1),
      throttle: pose.speedKmh > 0 ? 1 : 0,
      engineRunning: true,
      revLimiter: false,
      progressM: pose.progressM,
      position: 0,
      crashed: pose.crashed,
      finishTimeS: finish?.timeS ?? pose.finishTimeS,
      bestLapS: finish?.bestLapS ?? pose.bestLapS,
      remote: true,
    };
  });
  const all = [...view.riders, ...added];
  const order = [...all].sort((a, b) => {
    if (a.finishTimeS !== null && b.finishTimeS !== null) return a.finishTimeS - b.finishTimeS;
    if (a.finishTimeS !== null) return -1;
    if (b.finishTimeS !== null) return 1;
    return b.progressM - a.progressM;
  });
  const riders = all.map((r) => ({ ...r, position: order.indexOf(r) + 1 }));
  return { ...view, riders };
}

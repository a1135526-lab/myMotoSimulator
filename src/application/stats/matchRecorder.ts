import { getCircuit, getTrack } from '@/data';
import type { RaceResult } from '@/domain';
import { useRankedStore } from '../online/ranked/rankedStore';
import type { RoomSettings } from '../online/room/roomTypes';
import type { CircuitView } from '../viewModels/circuit';
import { useMatchStore } from './matchStore';
import { newMatchId, type MatchRecord, type MatchRider } from './matchTypes';

/**
 * Turns a decided race into a match-history entry: friend rooms, circuit
 * races against the AI, and drag races.
 */

interface PlayerBike {
  readonly label: string;
  readonly manual: boolean;
}

const circuitName = (id: string) => {
  try {
    return getCircuit(id).name;
  } catch {
    return id;
  }
};

/** Everyone in a circuit view as match riders (AI riders are named after their bikes). */
function ridersOf(view: CircuitView, myBike: string): MatchRider[] {
  return view.riders.map((r) => ({
    name: r.isPlayer ? '你' : r.name,
    bike: r.isPlayer ? myBike : (r.bike ?? r.name.replace(/ #\d+$/, '')),
    position: r.position,
    timeS: r.dnf ? null : r.finishTimeS,
    isMe: r.isPlayer,
    ...(r.accountName && { accountName: r.accountName }),
  }));
}

/** A ranked race under way: filed as ranked, and its place reported for points. */
function rankedNow(): boolean {
  const r = useRankedStore.getState();
  return r.match !== null && (r.phase === 'room' || r.phase === 'ai');
}

function file(match: MatchRecord): void {
  useMatchStore.getState().addMatch(match);
  if (match.kind === 'ranked') void useRankedStore.getState().report(match.position, match.field);
}

function fromCircuit(
  view: CircuitView,
  kind: 'room' | 'circuit',
  circuitId: string,
  laps: number,
  bike: PlayerBike,
): MatchRecord | null {
  const me = view.riders[0];
  if (!me) return null;
  const dnf = me.dnf === true || me.finishTimeS === null;
  return {
    id: newMatchId(),
    at: Date.now(),
    kind: rankedNow() ? 'ranked' : kind,
    trackId: circuitId,
    trackName: circuitName(circuitId),
    laps,
    bike: bike.label,
    manual: bike.manual,
    position: me.position,
    field: view.riders.length,
    won: !dnf && me.position === 1,
    dnf,
    timeS: dnf ? null : me.finishTimeS,
    bestLapS: me.bestLapS,
    riders: ridersOf(view, bike.label),
    ...(view.grades && { grade: { letter: view.grades.grade, score: view.grades.score } }),
  };
}

/** A friend-room race, once every rider has finished or run out of time. */
export function recordRoomMatch(view: CircuitView, settings: RoomSettings, bike?: PlayerBike) {
  const me = view.riders[0];
  const mine = bike ?? { label: me?.bike ?? '', manual: me?.manual ?? false };
  const match = fromCircuit(view, 'room', settings.circuitId, settings.laps, mine);
  if (match) file(match);
}

let circuitWasFinished = false;

/** Called every circuit frame (outside rooms): files the race when it ends. */
export function observeCircuitMatch(
  view: CircuitView,
  circuitId: string,
  laps: number,
  bike: PlayerBike,
) {
  const finished = view.phase === 'finished';
  if (finished && !circuitWasFinished) {
    const match = fromCircuit(view, 'circuit', circuitId, laps, bike);
    if (match) file(match);
  }
  circuitWasFinished = finished;
}

/** A drag race against the AI, once decided. */
export function recordDragMatch(
  result: RaceResult,
  strip: { readonly trackId: string; readonly distanceM: number },
  bike: PlayerBike,
  opponentBike: string,
) {
  if (result.winner === null) return;
  const custom = strip.trackId === 'custom';
  let trackName = `自訂 ${strip.distanceM} m`;
  if (!custom) {
    try {
      trackName = getTrack(strip.trackId).name;
    } catch {
      trackName = strip.trackId;
    }
  }
  const won = result.winner === 'player';
  const dnf = result.player.falseStart || !result.player.finished;
  useMatchStore.getState().addMatch({
    id: newMatchId(),
    at: Date.now(),
    kind: 'drag',
    trackId: custom ? `custom-${strip.distanceM}` : strip.trackId,
    trackName,
    laps: strip.distanceM,
    bike: bike.label,
    manual: bike.manual,
    position: won ? 1 : 2,
    field: 2,
    won,
    dnf,
    timeS: dnf ? null : result.player.totalS,
    bestLapS: null,
    riders: [
      {
        name: '你',
        bike: bike.label,
        position: won ? 1 : 2,
        timeS: result.player.totalS,
        isMe: true,
      },
      {
        name: '對手',
        bike: opponentBike,
        position: won ? 2 : 1,
        timeS: result.opponent.totalS,
        isMe: false,
      },
    ],
  });
}

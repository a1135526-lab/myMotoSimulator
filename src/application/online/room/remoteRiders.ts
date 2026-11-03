import type { PosePayload, RoomPlayer } from './roomTypes';

/**
 * Other players' bikes, smoothed. Poses arrive ~10 a second with uneven
 * delays, so each bike is drawn a little in the past and eased between the
 * two poses around that moment. Times are this device's clock on arrival,
 * so the players' clocks never need to agree.
 */

/** How far in the past remote bikes are drawn, ms. */
export const INTERP_DELAY_MS = 150;
/** No pose for this long: they've dropped out. */
export const STALE_MS = 5000;
const KEEP = 20;

interface Sample {
  readonly at: number;
  readonly pose: PosePayload;
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const lerpAngle = (a: number, b: number, f: number) =>
  a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * f;

/** One remote bike's recent poses. */
export class RemoteTrack {
  private samples: Sample[] = [];

  push(at: number, pose: PosePayload): void {
    this.samples.push({ at, pose });
    if (this.samples.length > KEEP) this.samples.shift();
  }

  lastAt(): number {
    return this.samples[this.samples.length - 1]?.at ?? -Infinity;
  }

  /** The pose INTERP_DELAY_MS ago, eased; the newest one once that runs out. */
  poseAt(now: number): PosePayload | null {
    const t = now - INTERP_DELAY_MS;
    const s = this.samples;
    const last = s[s.length - 1];
    if (!last) return null;
    if (t >= last.at) return last.pose;
    for (let i = s.length - 1; i > 0; i--) {
      const a = s[i - 1] as Sample;
      const b = s[i] as Sample;
      if (a.at <= t) {
        const f = b.at > a.at ? (t - a.at) / (b.at - a.at) : 1;
        return {
          ...b.pose,
          x: lerp(a.pose.x, b.pose.x, f),
          z: lerp(a.pose.z, b.pose.z, f),
          heading: lerpAngle(a.pose.heading, b.pose.heading, f),
          lean: lerp(a.pose.lean, b.pose.lean, f),
          speedKmh: lerp(a.pose.speedKmh, b.pose.speedKmh, f),
          rpm: lerp(a.pose.rpm, b.pose.rpm, f),
          progressM: lerp(a.pose.progressM, b.pose.progressM, f),
        };
      }
    }
    return (s[0] as Sample).pose;
  }
}

export interface RemoteRider {
  readonly player: RoomPlayer;
  readonly pose: PosePayload;
}

/** Every remote bike in the current race. */
export class RemoteRiders {
  private readonly tracks = new Map<string, RemoteTrack>();

  push(id: string, at: number, pose: PosePayload): void {
    let track = this.tracks.get(id);
    if (!track) {
      track = new RemoteTrack();
      this.tracks.set(id, track);
    }
    track.push(at, pose);
  }

  clear(): void {
    this.tracks.clear();
  }

  /** Players still sending, with where to draw them now. */
  sample(players: readonly RoomPlayer[], now: number): RemoteRider[] {
    const out: RemoteRider[] = [];
    for (const player of players) {
      const track = this.tracks.get(player.id);
      if (!track || now - track.lastAt() > STALE_MS) continue;
      const pose = track.poseAt(now);
      if (pose) out.push({ player, pose });
    }
    return out;
  }
}

import type { ActionListener } from './InputSource';
import { screenPitchDeg } from './TiltInputSource';

/** A flick is this much pitch… */
export const FLICK_DEG = 14;
/** …within this long. Slower is just changing grip. */
export const FLICK_WINDOW_MS = 220;
/** After a shift, ignore the phone swinging back for this long… */
const SETTLE_MS = 450;
/** …and until it's back within this of where the flick started (or a second has passed). */
const REARM_DEG = 7;
const REARM_MAX_MS = 1000;

/**
 * Spots a quick forward or backward flick in a stream of pitch readings:
 * +1 tipped away (upshift), −1 towards the rider (downshift), else 0. The
 * swing back to the usual grip never counts as a flick the other way.
 */
export class FlickDetector {
  private history: { t: number; pitch: number }[] = [];
  private firedAt: number | null = null;
  private startPitch = 0;

  push(tMs: number, pitchDeg: number): 1 | -1 | 0 {
    if (this.firedAt !== null) {
      const since = tMs - this.firedAt;
      const settled = since > SETTLE_MS && Math.abs(pitchDeg - this.startPitch) < REARM_DEG;
      if (!settled && since < REARM_MAX_MS) return 0;
      this.firedAt = null;
      this.history = [];
    }
    this.history.push({ t: tMs, pitch: pitchDeg });
    while (this.history.length > 0 && tMs - (this.history[0]?.t ?? tMs) > FLICK_WINDOW_MS) {
      this.history.shift();
    }
    let low = this.history[0] ?? { t: tMs, pitch: pitchDeg };
    let high = low;
    for (const h of this.history) {
      if (h.pitch < low.pitch) low = h;
      if (h.pitch > high.pitch) high = h;
    }
    const dir = pitchDeg - low.pitch >= FLICK_DEG ? 1 : high.pitch - pitchDeg >= FLICK_DEG ? -1 : 0;
    if (dir === 0) return 0;
    this.firedAt = tMs;
    this.startPitch = dir > 0 ? low.pitch : high.pitch;
    return dir;
  }
}

type OrientationTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/**
 * Shifting by flicking the phone: tip the top edge away and back for the
 * next gear up, towards you and back for the next one down.
 */
export class FlickShiftSource {
  private readonly detector = new FlickDetector();

  constructor(
    private readonly target: OrientationTarget,
    private readonly onAction: ActionListener,
    private readonly now: () => number = () => performance.now(),
  ) {
    target.addEventListener('deviceorientation', this.handleOrientation);
  }

  dispose(): void {
    this.target.removeEventListener('deviceorientation', this.handleOrientation);
  }

  private readonly handleOrientation = (event: Event): void => {
    const { beta, gamma } = event as DeviceOrientationEvent;
    if (beta === null || gamma === null || beta === undefined || gamma === undefined) return;
    const flick = this.detector.push(this.now(), screenPitchDeg(beta, gamma));
    if (flick === 1) this.onAction('shiftUp');
    else if (flick === -1) this.onAction('shiftDown');
  };
}

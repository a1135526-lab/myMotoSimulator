import { RELEASED, type InputCommand, type InputSource } from './InputSource';

/** Turning the phone this far, like a steering wheel, is full lock. */
export const TILT_FULL_DEG = 25;
/** A steady hand still wobbles; this much either side of centre steers nothing. */
export const TILT_DEADZONE_DEG = 2;
/** Lying near flat, the twist angle is mostly noise; keep the last steer instead. */
const MIN_UPRIGHT = 0.3;
const DEG = Math.PI / 180;

/**
 * Where "up" points within the screen plane, in degrees; it grows as the phone
 * is turned anticlockwise (to the left), in portrait or landscape alike.
 * From the W3C device orientation angles: β tips the top towards you, γ rolls
 * sideways. Returns null when the phone lies too flat to tell.
 */
export function screenTwistDeg(betaDeg: number, gammaDeg: number): number | null {
  const b = betaDeg * DEG;
  const g = gammaDeg * DEG;
  // World "up" in device axes (x right, y towards the top of the phone).
  const x = -Math.sin(g) * Math.cos(b);
  const y = Math.sin(b);
  if (Math.hypot(x, y) < MIN_UPRIGHT) return null;
  return Math.atan2(x, y) / DEG;
}

const wrapDeg = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** Twist away from centre → steering, −1…1 (+ = left). */
export function tiltAxis(offsetDeg: number): number {
  const beyond = Math.abs(offsetDeg) - TILT_DEADZONE_DEG;
  if (beyond <= 0) return 0;
  return Math.sign(offsetDeg) * Math.min(1, beyond / (TILT_FULL_DEG - TILT_DEADZONE_DEG));
}

type OrientationTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/**
 * Steering by turning the phone like a wheel. However it's held when the
 * first reading arrives is straight ahead; rotating the screen between
 * portrait and landscape re-centres.
 */
export class TiltInputSource implements InputSource {
  private axis = 0;
  private centreDeg: number | null = null;

  constructor(private readonly target: OrientationTarget) {
    target.addEventListener('deviceorientation', this.handleOrientation);
    target.addEventListener('orientationchange', this.recentre);
  }

  /** The way the phone is held now becomes straight ahead. */
  readonly recentre = (): void => {
    this.centreDeg = null;
    this.axis = 0;
  };

  read(): InputCommand {
    return this.axis === 0 ? RELEASED : { ...RELEASED, steerAxis: this.axis };
  }

  dispose(): void {
    this.target.removeEventListener('deviceorientation', this.handleOrientation);
    this.target.removeEventListener('orientationchange', this.recentre);
    this.axis = 0;
  }

  private readonly handleOrientation = (event: Event): void => {
    const { beta, gamma } = event as DeviceOrientationEvent;
    if (beta === null || gamma === null || beta === undefined || gamma === undefined) return;
    const twist = screenTwistDeg(beta, gamma);
    if (twist === null) return;
    this.centreDeg ??= twist;
    this.axis = tiltAxis(wrapDeg(twist - this.centreDeg));
  };
}

export type TiltPermission = 'granted' | 'denied' | 'unsupported';

/**
 * iOS only hands out motion data after the rider allows it, and only when
 * asked from a tap; other browsers just send it. Call from a click handler.
 */
export async function requestTiltPermission(): Promise<TiltPermission> {
  if (typeof DeviceOrientationEvent === 'undefined') return 'unsupported';
  const ask = (
    DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
  ).requestPermission;
  if (typeof ask !== 'function') return 'granted';
  try {
    return (await ask.call(DeviceOrientationEvent)) === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

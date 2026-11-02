import { describe, expect, it } from 'vitest';
import { CompositeInputSource } from './InputSource';
import {
  screenTwistDeg,
  TILT_DEADZONE_DEG,
  TILT_FULL_DEG,
  tiltAxis,
  TiltInputSource,
} from './TiltInputSource';
import { TouchInputSource } from './TouchInputSource';

const DEG = Math.PI / 180;

/**
 * Device angles for a phone standing upright, screen to the rider, turned
 * `twist` degrees anticlockwise from `base` (0 portrait, 90 landscape).
 */
function upright(twistDeg: number, baseDeg = 0) {
  const t = (twistDeg + baseDeg) * DEG;
  // World up in device axes is (sin t, cos t, 0); invert x = −sinγ·cosβ, y = sinβ.
  const beta = Math.asin(Math.cos(t)) / DEG;
  const cosB = Math.cos(beta * DEG);
  const gamma = cosB < 1e-9 ? 0 : Math.asin(Math.max(-1, Math.min(1, -Math.sin(t) / cosB))) / DEG;
  return { beta, gamma };
}

const orientation = (angles: { beta: number; gamma: number }) =>
  Object.assign(new Event('deviceorientation'), angles);

describe('screenTwistDeg', () => {
  it('reads the twist of an upright phone, anticlockwise positive', () => {
    for (const twist of [-30, -10, 0, 10, 30]) {
      const { beta, gamma } = upright(twist);
      expect(screenTwistDeg(beta, gamma)).toBeCloseTo(twist, 6);
    }
  });

  it('gives up when the phone lies flat', () => {
    expect(screenTwistDeg(0, 0)).toBeNull();
  });
});

describe('tiltAxis', () => {
  it('has a dead zone, then reaches full lock', () => {
    expect(tiltAxis(TILT_DEADZONE_DEG * 0.9)).toBe(0);
    expect(tiltAxis(TILT_FULL_DEG)).toBe(1);
    expect(tiltAxis(-TILT_FULL_DEG * 2)).toBe(-1);
    expect(tiltAxis(12)).toBeGreaterThan(0.3);
  });
});

describe('TiltInputSource', () => {
  it('centres on the first reading, then turning left steers left', () => {
    const target = new EventTarget();
    const tilt = new TiltInputSource(target);
    target.dispatchEvent(orientation(upright(7, 90))); // held slightly off in landscape
    expect(tilt.read().steerAxis).toBeUndefined();
    target.dispatchEvent(orientation(upright(7 + 15, 90)));
    expect(tilt.read().steerAxis).toBeGreaterThan(0.4);
    target.dispatchEvent(orientation(upright(7 - 40, 90)));
    expect(tilt.read().steerAxis).toBe(-1);
  });

  it('re-centres when the screen rotates, and stops when disposed', () => {
    const target = new EventTarget();
    const tilt = new TiltInputSource(target);
    target.dispatchEvent(orientation(upright(0)));
    target.dispatchEvent(new Event('orientationchange'));
    target.dispatchEvent(orientation(upright(0, 90)));
    expect(tilt.read().steerAxis).toBeUndefined();
    target.dispatchEvent(orientation(upright(20, 90)));
    tilt.dispose();
    expect(tilt.read().steerAxis).toBeUndefined();
  });

  it('combines with the buttons: the hardest steer wins', () => {
    const target = new EventTarget();
    const input = new CompositeInputSource();
    const touch = new TouchInputSource();
    input.add(touch);
    input.add(new TiltInputSource(target));
    target.dispatchEvent(orientation(upright(0)));
    target.dispatchEvent(orientation(upright(-12)));
    expect(input.read().steerAxis).toBeLessThan(0);
    touch.press('throttle');
    expect(input.read()).toMatchObject({ throttlePressed: true, steerLeftPressed: false });
  });
});

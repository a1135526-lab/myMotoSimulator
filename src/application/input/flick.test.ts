import { describe, expect, it, vi } from 'vitest';
import { FLICK_DEG, FlickDetector, FlickShiftSource } from './FlickShiftSource';
import { screenPitchDeg, screenTwistDeg } from './TiltInputSource';

/** Feed pitch samples every 16 ms; returns the non-zero flicks with their times. */
function run(detector: FlickDetector, pitches: number[], startMs = 0) {
  const fired: { t: number; dir: number }[] = [];
  pitches.forEach((p, i) => {
    const t = startMs + i * 16;
    const dir = detector.push(t, p);
    if (dir !== 0) fired.push({ t, dir });
  });
  return fired;
}

const ramp = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);
const hold = (value: number, steps: number) => Array.from({ length: steps }, () => value);

describe('FlickDetector', () => {
  it('a quick tip forward and back is one upshift, not a downshift on the way back', () => {
    const fired = run(new FlickDetector(), [
      ...hold(35, 10),
      ...ramp(35, 60, 6),
      ...ramp(60, 35, 8),
      ...hold(35, 40),
    ]);
    expect(fired.map((f) => f.dir)).toEqual([1]);
  });

  it('a quick tip towards the rider is a downshift', () => {
    const fired = run(new FlickDetector(), [
      ...hold(35, 10),
      ...ramp(35, 12, 6),
      ...ramp(12, 35, 8),
      ...hold(35, 40),
    ]);
    expect(fired.map((f) => f.dir)).toEqual([-1]);
  });

  it('slowly changing grip never shifts', () => {
    expect(run(new FlickDetector(), ramp(10, 80, 200))).toEqual([]);
  });

  it('two flicks in a row are two shifts', () => {
    const flick = [...ramp(30, 30 + FLICK_DEG + 6, 5), ...ramp(30 + FLICK_DEG + 6, 30, 8)];
    const fired = run(new FlickDetector(), [...hold(30, 5), ...flick, ...hold(30, 40), ...flick]);
    expect(fired.map((f) => f.dir)).toEqual([1, 1]);
  });
});

describe('pitch and twist are independent', () => {
  it('turning the phone like a wheel leaves the pitch alone', () => {
    expect(screenPitchDeg(90, 0)).toBeCloseTo(0, 4); // upright, facing the rider
    expect(screenPitchDeg(0, 0)).toBeCloseTo(90, 4); // flat, facing the sky
    // An upright landscape phone turned ±30° like a wheel: still upright.
    for (const twist of [-30, 0, 30]) {
      const t = ((twist + 90) * Math.PI) / 180;
      const beta = (Math.asin(Math.cos(t)) * 180) / Math.PI;
      const cosB = Math.cos((beta * Math.PI) / 180);
      const gamma = cosB < 1e-9 ? 0 : (Math.asin(-Math.sin(t) / cosB) * 180) / Math.PI;
      expect(screenPitchDeg(beta, gamma)).toBeCloseTo(0, 4);
      expect(screenTwistDeg(beta, gamma)).not.toBeNull();
    }
  });
});

describe('FlickShiftSource', () => {
  it('turns a flick into a shift action', () => {
    const target = new EventTarget();
    const onAction = vi.fn();
    let now = 0;
    const source = new FlickShiftSource(target, onAction, () => now);
    // Upright grip (pitch 0), then the top tipped away by 25° in ~100 ms.
    const tip = (pitch: number) => {
      // An upright phone tipped back by `pitch` reads β = 90 − pitch, γ = 0.
      target.dispatchEvent(
        Object.assign(new Event('deviceorientation'), { beta: 90 - pitch, gamma: 0 }),
      );
      now += 16;
    };
    for (const p of [0, 0, 0, 5, 12, 19, 25]) tip(p);
    expect(onAction).toHaveBeenCalledWith('shiftUp');
    source.dispose();
  });
});

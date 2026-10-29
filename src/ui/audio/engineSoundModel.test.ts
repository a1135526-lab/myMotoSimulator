import { describe, expect, it } from 'vitest';
import {
  distanceGain,
  firingHz,
  LIMITER_CHOP_HZ,
  subOscillatorMix,
  voiceParams,
  windGain,
} from './engineSoundModel';

const base = { rpm: 6000, throttle: 1, running: true, limiter: false, cylinders: 1 };

describe('engine sound model', () => {
  it('fires once every two revolutions per cylinder (four-stroke)', () => {
    expect(firingHz(6000, 1)).toBe(50);
    expect(firingHz(6000, 2)).toBe(100);
    expect(firingHz(12000, 4)).toBe(400);
    expect(firingHz(-100, 1)).toBe(0);
  });

  it('a four sounds higher-pitched than a single at the same rpm', () => {
    expect(voiceParams({ ...base, cylinders: 4 }).firingHz).toBeGreaterThan(
      voiceParams(base).firingHz,
    );
  });

  it('opening the throttle makes it louder, brighter and grittier', () => {
    const shut = voiceParams({ ...base, throttle: 0 });
    const open = voiceParams(base);
    expect(open.gain).toBeGreaterThan(shut.gain);
    expect(open.cutoffHz).toBeGreaterThan(shut.cutoffHz);
    expect(open.drive).toBeGreaterThan(shut.drive);
    expect(open.noiseGain).toBeGreaterThan(shut.noiseGain);
  });

  it('a stalled engine fades out as it spins down', () => {
    expect(voiceParams({ ...base, running: false, rpm: 0 }).gain).toBe(0);
    expect(voiceParams({ ...base, running: false, rpm: 500 }).gain).toBeLessThan(
      voiceParams({ ...base, rpm: 500 }).gain,
    );
  });

  it('the rev limiter chops the sound on and off', () => {
    const half = 1 / (LIMITER_CHOP_HZ * 2);
    const a = voiceParams({ ...base, limiter: true }, 0).gain;
    const b = voiceParams({ ...base, limiter: true }, half * 1.5).gain;
    expect(a).not.toBeCloseTo(b);
    expect(Math.max(a, b)).toBeCloseTo(voiceParams(base).gain);
  });

  it('wind grows with speed and is capped; opponent fades with distance', () => {
    expect(windGain(0)).toBe(0);
    expect(windGain(100)).toBeLessThan(windGain(200));
    expect(windGain(400)).toBe(windGain(200));
    expect(distanceGain(0)).toBe(1);
    expect(distanceGain(50)).toBeLessThan(distanceGain(10));
  });

  it('singles and twins get more sub-harmonic "lump" than triples and fours', () => {
    expect(subOscillatorMix(1)).toBeGreaterThan(subOscillatorMix(4));
  });
});

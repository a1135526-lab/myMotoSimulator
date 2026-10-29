import { windGain } from './engineSoundModel';
import { EngineVoice } from './EngineVoice';

const MASTER_GAIN = 0.7;
const NOISE_SECONDS = 2;
const WIND_CUTOFF_HZ = 900;
const GLIDE_S = 0.08;

/**
 * Owns the AudioContext: master volume, a shared noise buffer, wind rush, and
 * the engine voices. Returns null where Web Audio isn't available (tests,
 * very old browsers) so callers simply stay silent.
 */
export class AudioEngine {
  private readonly master: GainNode;
  private readonly windGainNode: GainNode;
  private readonly noise: AudioBuffer;
  private readonly windSource: AudioBufferSourceNode;

  private constructor(private readonly ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * NOISE_SECONDS, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.windSource = ctx.createBufferSource();
    this.windSource.buffer = this.noise;
    this.windSource.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = WIND_CUTOFF_HZ;
    this.windGainNode = ctx.createGain();
    this.windGainNode.gain.value = 0;
    this.windSource.connect(windFilter).connect(this.windGainNode).connect(this.master);
    this.windSource.start();
  }

  static create(): AudioEngine | null {
    const Ctor =
      typeof window === 'undefined'
        ? undefined
        : (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    try {
      return new AudioEngine(new Ctor());
    } catch {
      return null;
    }
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  /** Browsers start contexts suspended until a user gesture. */
  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  createVoice(cylinders: number): EngineVoice {
    return new EngineVoice(this.ctx, this.master, this.noise, cylinders);
  }

  setWind(speedKmh: number): void {
    this.windGainNode.gain.setTargetAtTime(windGain(speedKmh), this.ctx.currentTime, GLIDE_S);
  }

  dispose(): void {
    this.windSource.stop();
    void this.ctx.close();
  }
}

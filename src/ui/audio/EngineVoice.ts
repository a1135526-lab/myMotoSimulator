import { subOscillatorMix, type VoiceParams } from './engineSoundModel';

/** Smoothing time constant for parameter changes, s — avoids zipper noise. */
const GLIDE_S = 0.025;
const HARMONICS = 32;

/**
 * Exhaust-pulse spectrum: a sawtooth-like 1/n roll-off with the 2nd–6th
 * harmonics lifted, which is where most of a bike's "bark" lives.
 */
function exhaustWave(ctx: AudioContext): PeriodicWave {
  const real = new Float32Array(HARMONICS);
  const imag = new Float32Array(HARMONICS);
  for (let n = 1; n < HARMONICS; n++) imag[n] = (1 / n) * (n >= 2 && n <= 6 ? 1.6 : 0.8);
  return ctx.createPeriodicWave(real, imag);
}

/** Soft-clip curve; drive is applied as gain *before* it so the curve never changes. */
function softClip(): Float32Array {
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.5 * x);
  }
  return curve;
}

/**
 * One engine: two slightly detuned exhaust oscillators + a sub-oscillator at
 * half the firing rate, a band-passed noise "roar", distortion, a throttle-
 * controlled low-pass, then gain and stereo pan.
 */
export class EngineVoice {
  private readonly main: OscillatorNode;
  private readonly detuned: OscillatorNode;
  private readonly sub: OscillatorNode;
  private readonly noiseBand: BiquadFilterNode;
  private readonly noiseGain: GainNode;
  private readonly preDrive: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly volume: GainNode;
  private readonly panner: StereoPannerNode;
  private readonly sources: AudioScheduledSourceNode[];

  constructor(
    private readonly ctx: AudioContext,
    output: AudioNode,
    noise: AudioBuffer,
    cylinders: number,
  ) {
    const wave = exhaustWave(ctx);
    this.main = ctx.createOscillator();
    this.main.setPeriodicWave(wave);
    this.detuned = ctx.createOscillator();
    this.detuned.setPeriodicWave(wave);
    this.detuned.detune.value = 9;
    this.sub = ctx.createOscillator();
    this.sub.type = 'triangle';

    const subGain = ctx.createGain();
    subGain.gain.value = subOscillatorMix(cylinders);
    const detunedGain = ctx.createGain();
    detunedGain.gain.value = 0.5;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noise;
    noiseSource.loop = true;
    this.noiseBand = ctx.createBiquadFilter();
    this.noiseBand.type = 'bandpass';
    this.noiseBand.Q.value = 1.1;
    this.noiseGain = ctx.createGain();

    this.preDrive = ctx.createGain();
    const shaper = ctx.createWaveShaper();
    shaper.curve = softClip();
    shaper.oversample = '2x';
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.Q.value = 0.8;
    this.volume = ctx.createGain();
    this.volume.gain.value = 0;
    this.panner = ctx.createStereoPanner();

    this.main.connect(this.preDrive);
    this.detuned.connect(detunedGain).connect(this.preDrive);
    this.sub.connect(subGain).connect(this.preDrive);
    noiseSource.connect(this.noiseBand).connect(this.noiseGain).connect(this.preDrive);
    this.preDrive.connect(shaper).connect(this.lowpass).connect(this.volume);
    this.volume.connect(this.panner).connect(output);

    this.sources = [this.main, this.detuned, this.sub, noiseSource];
    for (const s of this.sources) s.start();
  }

  update(p: VoiceParams, pan = 0, loudness = 1): void {
    const t = this.ctx.currentTime;
    const glide = (param: AudioParam, value: number) => param.setTargetAtTime(value, t, GLIDE_S);
    const hz = Math.max(1, p.firingHz);
    glide(this.main.frequency, hz);
    glide(this.detuned.frequency, hz);
    glide(this.sub.frequency, hz / 2);
    glide(this.noiseBand.frequency, Math.max(80, hz * 3));
    glide(this.noiseGain.gain, p.noiseGain);
    glide(this.preDrive.gain, 0.4 + p.drive * 2.2);
    glide(this.lowpass.frequency, p.cutoffHz);
    glide(this.volume.gain, p.gain * loudness);
    glide(this.panner.pan, pan);
  }

  dispose(): void {
    for (const s of this.sources) s.stop();
    this.panner.disconnect();
  }
}

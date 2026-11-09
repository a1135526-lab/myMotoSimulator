import type { HornPreset } from '@/application';

/**
 * Horn sounds, made on the spot with Web Audio (no sound files to ship).
 * Each returns a function that lets the horn go: a held horn sounds until
 * then, a tune or recording plays through.
 */
export type StopHorn = () => void;

const ATTACK_S = 0.01;
const RELEASE_S = 0.06;
/** A tap still gives a short honk. */
const MIN_HONK_S = 0.12;
const HORN_GAIN = 0.35;

interface Tone {
  readonly freqs: readonly number[];
  readonly wave: OscillatorType;
  readonly cutoffHz: number;
  /** Fast on/off, Hz (0 = steady). */
  readonly pulseHz: number;
}

const TONES: Readonly<Record<'standard' | 'beep' | 'truck', Tone>> = {
  // A scooter's electric horn: two close pitches beating against each other.
  standard: { freqs: [415, 495], wave: 'square', cutoffHz: 2600, pulseHz: 0 },
  beep: { freqs: [880], wave: 'square', cutoffHz: 4000, pulseHz: 7 },
  truck: { freqs: [165, 208, 247], wave: 'sawtooth', cutoffHz: 1400, pulseHz: 0 },
};

/** Notes of the musical horn: [Hz, beats]. */
const TUNE: readonly (readonly [number, number])[] = [
  [523, 1],
  [659, 1],
  [784, 1],
  [1047, 2],
  [784, 1],
  [1047, 3],
];
const TUNE_BEAT_S = 0.11;

function envelope(ctx: AudioContext, out: AudioNode): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(HORN_GAIN, ctx.currentTime + ATTACK_S);
  gain.connect(out);
  return gain;
}

function holdTone(ctx: AudioContext, out: AudioNode, tone: Tone): StopHorn {
  const started = ctx.currentTime;
  const gain = envelope(ctx, out);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = tone.cutoffHz;
  filter.connect(gain);
  const voice = ctx.createGain();
  voice.gain.value = 1 / tone.freqs.length;
  voice.connect(filter);
  const sources: OscillatorNode[] = tone.freqs.map((f) => {
    const osc = ctx.createOscillator();
    osc.type = tone.wave;
    osc.frequency.value = f;
    osc.connect(voice);
    osc.start();
    return osc;
  });
  if (tone.pulseHz > 0) {
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = tone.pulseHz;
    const depth = ctx.createGain();
    depth.gain.value = 0.5 / tone.freqs.length;
    voice.gain.value = 0.5 / tone.freqs.length;
    lfo.connect(depth).connect(voice.gain);
    lfo.start();
    sources.push(lfo);
  }
  return () => {
    const end = Math.max(ctx.currentTime, started + MIN_HONK_S);
    gain.gain.setValueAtTime(HORN_GAIN, end);
    gain.gain.linearRampToValueAtTime(0, end + RELEASE_S);
    sources.forEach((s) => s.stop(end + RELEASE_S + 0.01));
  };
}

function playTune(ctx: AudioContext, out: AudioNode): StopHorn {
  const gain = ctx.createGain();
  gain.gain.value = HORN_GAIN;
  gain.connect(out);
  let t = ctx.currentTime;
  for (const [f, beats] of TUNE) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = f;
    const note = ctx.createGain();
    const len = beats * TUNE_BEAT_S;
    note.gain.setValueAtTime(0, t);
    note.gain.linearRampToValueAtTime(0.5, t + ATTACK_S);
    note.gain.setValueAtTime(0.5, t + len - 0.02);
    note.gain.linearRampToValueAtTime(0, t + len);
    osc.connect(note).connect(gain);
    osc.start(t);
    osc.stop(t + len);
    t += len;
  }
  // A tune always plays to the end once started.
  return () => undefined;
}

/** Decoded recordings, by data URL, so a honk starts at once after the first. */
const decoded = new Map<string, Promise<AudioBuffer>>();

function decode(ctx: AudioContext, clip: string): Promise<AudioBuffer> {
  let buffer = decoded.get(clip);
  if (!buffer) {
    buffer = fetch(clip)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    decoded.set(clip, buffer);
    buffer.catch(() => decoded.delete(clip));
  }
  return buffer;
}

function playClip(ctx: AudioContext, out: AudioNode, clip: string): StopHorn {
  void decode(ctx, clip)
    .then((buffer) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(out);
      src.start();
    })
    .catch(() => undefined);
  return () => undefined;
}

export function soundHorn(
  ctx: AudioContext,
  out: AudioNode,
  preset: HornPreset,
  clip: string | null,
): StopHorn {
  if (preset === 'custom')
    return clip ? playClip(ctx, out, clip) : holdTone(ctx, out, TONES.standard);
  if (preset === 'tune') return playTune(ctx, out);
  return holdTone(ctx, out, TONES[preset]);
}

/** One shared context for the horn, made on the first honk (a user gesture). */
let shared: AudioContext | null = null;

export function hornContext(): AudioContext | null {
  if (shared) {
    if (shared.state === 'suspended') void shared.resume();
    return shared;
  }
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  try {
    shared = new Ctor();
    return shared;
  } catch {
    return null;
  }
}

/** Sound the horn once, as a preview (settings). */
export function previewHorn(preset: HornPreset, clip: string | null): void {
  const ctx = hornContext();
  if (!ctx) return;
  const stop = soundHorn(ctx, ctx.destination, preset, clip);
  setTimeout(stop, 500);
}

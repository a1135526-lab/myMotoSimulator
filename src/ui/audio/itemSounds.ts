import type { ItemCue } from '@/application';

/**
 * Item race sounds, made on the spot with Web Audio (no files to ship). Each
 * is a short shot of oscillators or noise that cleans itself up.
 */
const LEVEL = 0.22;

type Step = readonly [hz: number, startS: number, lengthS: number];

interface Blip {
  readonly wave: OscillatorType;
  readonly steps: readonly Step[];
  /** Pitch glides from the first step's note to this, Hz (null = steady notes). */
  readonly glideTo?: number;
}

/** Arpeggios and sweeps per cue; `noise` cues add a burst of filtered noise. */
const BLIPS: Readonly<Record<ItemCue, Blip>> = {
  // A box opened: a bright rising arpeggio.
  pick: {
    wave: 'triangle',
    steps: [
      [660, 0, 0.07],
      [880, 0.07, 0.07],
      [1320, 0.14, 0.12],
    ],
  },
  boost: { wave: 'sawtooth', steps: [[180, 0, 0.55]], glideTo: 720 },
  drop: {
    wave: 'square',
    steps: [
      [330, 0, 0.06],
      [220, 0.06, 0.1],
    ],
  },
  shoot: { wave: 'triangle', steps: [[900, 0, 0.22]], glideTo: 300 },
  shield: {
    wave: 'sine',
    steps: [
      [523, 0, 0.12],
      [784, 0.08, 0.12],
      [1047, 0.16, 0.25],
    ],
  },
  flash: { wave: 'sine', steps: [[1800, 0, 0.18]], glideTo: 2600 },
  skate: {
    wave: 'square',
    steps: [
      [988, 0, 0.08],
      [784, 0.09, 0.08],
      [523, 0.18, 0.16],
    ],
  },
  // Got hit: a falling buzz.
  hit: { wave: 'sawtooth', steps: [[420, 0, 0.45]], glideTo: 90 },
  block: {
    wave: 'sine',
    steps: [
      [1200, 0, 0.08],
      [1600, 0.06, 0.14],
    ],
  },
  landed: {
    wave: 'triangle',
    steps: [
      [784, 0, 0.08],
      [1175, 0.08, 0.14],
    ],
  },
  skated: { wave: 'square', steps: [[600, 0, 0.7]], glideTo: 120 },
};

/** A short burst of filtered noise (the splat of oil, a hit). */
const NOISY: ReadonlySet<ItemCue> = new Set(['drop', 'hit']);

function noise(ctx: AudioContext, out: AudioNode, at: number, lengthS: number): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * lengthS));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.value = LEVEL * 0.8;
  src.connect(filter).connect(gain).connect(out);
  src.start(at);
}

export function playItemCue(ctx: AudioContext, out: AudioNode, cue: ItemCue): void {
  const blip = BLIPS[cue];
  const t0 = ctx.currentTime + 0.005;
  for (const [hz, start, length] of blip.steps) {
    const osc = ctx.createOscillator();
    osc.type = blip.wave;
    const at = t0 + start;
    osc.frequency.setValueAtTime(hz, at);
    if (blip.glideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(blip.glideTo, at + length);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(LEVEL, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }
  if (NOISY.has(cue)) noise(ctx, out, t0, cue === 'hit' ? 0.3 : 0.15);
}

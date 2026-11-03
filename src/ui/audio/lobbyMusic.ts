/**
 * The lobby's music: an original synthwave loop played live by Web Audio —
 * no recordings, nothing licensed. Drums, a bass line, a soft chord pad and an
 * arpeggio with an echo, four chords round and round.
 */

const BPM = 108;
const STEPS_PER_BAR = 16;
const STEP_S = 60 / BPM / 4;
/** How far ahead notes are put on the audio clock, s; the timer only has to keep up. */
const LOOKAHEAD_S = 0.12;
const TIMER_MS = 25;
const VOLUME = 0.22;
const FADE_S = 1.2;

/** A minor – F – C – G, as MIDI notes (root, then the chord). */
const BARS: readonly { readonly root: number; readonly chord: readonly number[] }[] = [
  { root: 45, chord: [57, 60, 64] },
  { root: 41, chord: [57, 60, 65] },
  { root: 48, chord: [55, 60, 64] },
  { root: 43, chord: [55, 59, 62] },
];
const ARP_ORDER = [0, 1, 2, 1, 2, 3, 2, 1];
const BASS_STEPS = [0, 3, 6, 8, 10, 14];

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class LobbyMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private echo: DelayNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextAt = 0;

  get playing(): boolean {
    return this.timer !== null;
  }

  /** After the first click / key press: browsers keep audio silent until then. */
  resume(): void {
    void this.ctx?.resume();
  }

  /** Starts the loop (silent until the page has had a click or key press). */
  start(): void {
    if (this.timer !== null) return;
    const ctx = (this.ctx ??= new AudioContext());
    void ctx.resume();
    if (!this.master) this.build(ctx);
    const master = this.master as GainNode;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE_S);
    this.nextAt = ctx.currentTime + 0.05;
    this.tick();
  }

  stop(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    const { ctx, master } = this;
    if (!ctx || !master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_S / 2);
  }

  private build(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    // A dotted-eighth echo for the arpeggio.
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = STEP_S * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    this.echo.connect(feedback).connect(this.echo);
    this.echo.connect(this.master);
    const length = Math.floor(ctx.sampleRate * 0.5);
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Put the next few steps on the audio clock, then come back shortly. */
  private readonly tick = (): void => {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextAt < ctx.currentTime + LOOKAHEAD_S) {
      this.playStep(this.step, this.nextAt);
      this.step = (this.step + 1) % (STEPS_PER_BAR * BARS.length);
      this.nextAt += STEP_S;
    }
    this.timer = window.setTimeout(this.tick, TIMER_MS);
  };

  private playStep(step: number, at: number): void {
    const bar = BARS[Math.floor(step / STEPS_PER_BAR)] ?? BARS[0];
    const s = step % STEPS_PER_BAR;
    if (!bar) return;
    if (s % 4 === 0) this.kick(at);
    if (s === 4 || s === 12) this.snare(at);
    if (s % 2 === 1) this.hat(at, s % 4 === 3 ? 0.06 : 0.035);
    if (BASS_STEPS.includes(s)) this.tone(hz(bar.root), at, STEP_S * 1.8, 'sawtooth', 0.16, 700);
    if (s === 0) for (const n of bar.chord) this.pad(hz(n), at, STEP_S * STEPS_PER_BAR);
    const arpNote = bar.chord[ARP_ORDER[s % ARP_ORDER.length] ?? 0] ?? bar.chord[0] ?? 60;
    const octave = s >= 8 ? 24 : 12;
    this.tone(hz(arpNote + octave), at, STEP_S * 0.9, 'square', 0.045, 2400, true);
  }

  private envelope(at: number, peak: number, length: number): GainNode {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    g.connect(this.master as GainNode);
    return g;
  }

  private tone(
    freq: number,
    at: number,
    length: number,
    type: OscillatorType,
    peak: number,
    cutoff: number,
    echoed = false,
  ): void {
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = this.envelope(at, peak, length);
    osc.connect(filter).connect(g);
    if (echoed && this.echo) g.connect(this.echo);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }

  private pad(freq: number, at: number, length: number): void {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.03, at + length * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, at + length);
    g.connect(this.master as GainNode);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.connect(g);
    for (const detune of [-8, 8]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + length + 0.05);
    }
  }

  private kick(at: number): void {
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(130, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.12);
    osc.connect(this.envelope(at, 0.55, 0.3));
    osc.start(at);
    osc.stop(at + 0.35);
  }

  private burst(at: number, peak: number, length: number, type: BiquadFilterType, freq: number) {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    src.connect(filter).connect(this.envelope(at, peak, length));
    src.start(at);
    src.stop(at + length + 0.02);
  }

  private snare(at: number): void {
    this.burst(at, 0.22, 0.18, 'bandpass', 1800);
  }

  private hat(at: number, peak: number): void {
    this.burst(at, peak, 0.05, 'highpass', 7000);
  }
}

/** One player for the whole app, so moving between lobby pages doesn't restart the song. */
export const lobbyMusic = new LobbyMusic();

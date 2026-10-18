/**
 * The voice of the guitar hidden in the home page's grass: each click plays the next note of a
 * short, original chill tune (Am7 – Fmaj7 – Cmaj7 – G6, then home to A minor), and starts over
 * when it ends. Plucked strings are synthesised (Karplus–Strong) with a soft room reverb, so
 * nothing is downloaded. The AudioContext starts on the first click (browsers allow sound
 * after a gesture).
 */

interface Step {
  /** MIDI note of the melody. */
  note: number;
  /** A low root under the first note of a bar. */
  bass?: number;
  /** The last step: a slow strum of the whole chord. */
  chord?: number[];
}

const A2 = 45;
const C3 = 48;
const F2 = 41;
const G2 = 43;
// Melody in MIDI numbers (60 = middle C).
const A4 = 69;
const B4 = 71;
const C5 = 72;
const D5 = 74;
const E5 = 76;
const F5 = 77;
const G5 = 79;
const A5 = 81;
const E4 = 64;
const G4 = 67;

const TUNE: Step[] = [
  // Am7
  { note: A4, bass: A2 }, { note: C5 }, { note: E5 }, { note: G5 }, { note: E5 }, { note: C5 }, { note: D5 }, { note: E5 },
  // Fmaj7
  { note: C5, bass: F2 }, { note: A4 }, { note: C5 }, { note: E5 }, { note: F5 }, { note: E5 }, { note: C5 }, { note: A4 },
  // Cmaj7
  { note: G4, bass: C3 }, { note: B4 }, { note: C5 }, { note: E5 }, { note: G5 }, { note: E5 }, { note: D5 }, { note: C5 },
  // G6
  { note: B4, bass: G2 }, { note: D5 }, { note: E5 }, { note: G5 }, { note: A5 }, { note: G5 }, { note: E5 }, { note: D5 },
  // Home
  { note: E5, bass: A2 }, { note: C5 }, { note: A4 }, { note: G4 }, { note: E4 }, { note: G4 },
  { note: A4, chord: [A2, 52, 57, 60, 64] },
];

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class GuitarVoice {
  private ctx: AudioContext | null = null;
  private input: GainNode | null = null;
  private readonly buffers = new Map<number, AudioBuffer>();
  private at = 0;

  /** Plays the next note of the tune; returns its place (0 = the tune starts again). */
  playNext(): number {
    const ctx = this.ready();
    if (!ctx) return this.at;
    const step = TUNE[this.at];
    const t = ctx.currentTime + 0.01;
    this.pluck(step.note, t, 0.55);
    if (step.bass !== undefined) this.pluck(step.bass, t, 0.32);
    // A slow strum, low to high.
    step.chord?.forEach((n, i) => this.pluck(n, t + 0.06 + i * 0.07, 0.3));
    const played = this.at;
    this.at = (this.at + 1) % TUNE.length;
    return played;
  }

  dispose() {
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }

  private ready(): AudioContext | null {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      // pluck → warm low-pass → (dry + reverb) → master
      const input = ctx.createGain();
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 3200;
      const master = ctx.createGain();
      master.gain.value = 0.7;
      const reverb = ctx.createConvolver();
      reverb.buffer = this.room(ctx, 2.4);
      const wet = ctx.createGain();
      wet.gain.value = 0.38;
      input.connect(tone);
      tone.connect(master);
      tone.connect(reverb);
      reverb.connect(wet);
      wet.connect(master);
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.input = input;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private pluck(midi: number, when: number, level: number) {
    const ctx = this.ctx;
    if (!ctx || !this.input) return;
    const src = ctx.createBufferSource();
    src.buffer = this.string(ctx, midi);
    const gain = ctx.createGain();
    gain.gain.value = level;
    src.connect(gain);
    gain.connect(this.input);
    src.start(when);
  }

  /** Karplus–Strong: a burst of soft noise circulating in a delay line the length of one period. */
  private string(ctx: AudioContext, midi: number): AudioBuffer {
    const cached = this.buffers.get(midi);
    if (cached) return cached;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 3);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq(midi)));
    const ring = new Float32Array(period);
    // Softened noise: a finger, not a pick.
    let prev = 0;
    for (let i = 0; i < period; i++) {
      prev = prev * 0.5 + (Math.random() * 2 - 1) * 0.5;
      ring[i] = prev;
    }
    // High strings ring a little shorter.
    const decay = 0.9985 - Math.min(0.004, (midi - 40) * 0.00006);
    let idx = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const next = idx + 1 === period ? 0 : idx + 1;
      const v = ring[idx];
      out[i] = v;
      peak = Math.max(peak, Math.abs(v));
      ring[idx] = decay * 0.5 * (v + ring[next]);
      idx = next;
    }
    const norm = peak > 0 ? 0.8 / peak : 1;
    const fade = Math.floor(sr * 0.3);
    for (let i = 0; i < len; i++) out[i] *= norm * (i > len - fade ? (len - i) / fade : 1);
    this.buffers.set(midi, buf);
    return buf;
  }

  /** A soft room: stereo noise fading away. */
  private room(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    return buf;
  }
}

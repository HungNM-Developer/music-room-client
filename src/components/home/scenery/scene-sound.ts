/**
 * Sounds of the home page's hidden toys, all synthesised (nothing is downloaded) through one
 * shared room: a warm low-pass and a soft reverb. The AudioContext starts on the first click
 * or drag (browsers allow sound after a gesture).
 *
 * - The guitar: each click plays the next note of a short, original chill tune (Am7 – Fmaj7 –
 *   Cmaj7 – G6, home to A minor); plucked strings by Karplus–Strong.
 * - The toy train: while it runs, every stretch of track plays the next note of a cheerful
 *   original tune on a music box, with a soft chuff; a click without a drag blows its whistle.
 * Both tunes start over when they end.
 */

interface Step {
  /** MIDI note of the melody (60 = middle C). */
  note: number;
  /** A low root under the first note of a bar. */
  bass?: number;
  /** The last step: a slow strum of the whole chord. */
  chord?: number[];
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// Notes by name (MIDI).
const N = {
  F2: 41, G2: 43, A2: 45, C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, C4: 60,
  E4: 64, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, C6: 84,
} as const;

const GUITAR_TUNE: Step[] = [
  // Am7
  { note: N.A4, bass: N.A2 }, { note: N.C5 }, { note: N.E5 }, { note: N.G5 }, { note: N.E5 }, { note: N.C5 }, { note: N.D5 }, { note: N.E5 },
  // Fmaj7
  { note: N.C5, bass: N.F2 }, { note: N.A4 }, { note: N.C5 }, { note: N.E5 }, { note: N.F5 }, { note: N.E5 }, { note: N.C5 }, { note: N.A4 },
  // Cmaj7
  { note: N.G4, bass: N.C3 }, { note: N.B4 }, { note: N.C5 }, { note: N.E5 }, { note: N.G5 }, { note: N.E5 }, { note: N.D5 }, { note: N.C5 },
  // G6
  { note: N.B4, bass: N.G2 }, { note: N.D5 }, { note: N.E5 }, { note: N.G5 }, { note: N.A5 }, { note: N.G5 }, { note: N.E5 }, { note: N.D5 },
  // Home
  { note: N.E5, bass: N.A2 }, { note: N.C5 }, { note: N.A4 }, { note: N.G4 }, { note: N.E4 }, { note: N.G4 },
  { note: N.A4, chord: [N.A2, N.E3, N.A3, N.C4, N.E4] },
];

/** A cheerful little railway tune in C (I – IV – ii – V, twice, home). */
const TRAIN_TUNE: Step[] = [
  { note: N.G4, bass: N.C3 }, { note: N.C5 }, { note: N.E5 }, { note: N.G5 },
  { note: N.F5, bass: N.F3 }, { note: N.E5 }, { note: N.D5 }, { note: N.C5 },
  { note: N.A4, bass: N.D3 }, { note: N.D5 }, { note: N.F5 }, { note: N.A5 },
  { note: N.G5, bass: N.G2 }, { note: N.F5 }, { note: N.E5 }, { note: N.D5 },
  { note: N.E5, bass: N.C3 }, { note: N.G5 }, { note: N.C6 }, { note: N.G5 },
  { note: N.F5, bass: N.F3 }, { note: N.A5 }, { note: N.G5 }, { note: N.F5 },
  { note: N.E5, bass: N.G2 }, { note: N.D5 }, { note: N.C5 }, { note: N.D5 },
  { note: N.E5, bass: N.C3 }, { note: N.D5 }, { note: N.C5, chord: [N.C3, N.G3, N.C4, N.E4, N.G4] },
];

/** The shared room every sound goes through. */
export class SceneAudio {
  private ctx: AudioContext | null = null;
  private input: GainNode | null = null;

  /** The context and the room's input, started on demand (after a gesture). */
  ready(): { ctx: AudioContext; input: GainNode } | null {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      // sound → warm low-pass → (dry + reverb) → master
      const input = ctx.createGain();
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 3200;
      const master = ctx.createGain();
      master.gain.value = 0.7;
      const reverb = ctx.createConvolver();
      reverb.buffer = room(ctx, 2.4);
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
    return { ctx: this.ctx, input: this.input! };
  }

  dispose() {
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.input = null;
  }
}

/** A soft room: stereo noise fading away. */
function room(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}

function play(audio: { ctx: AudioContext; input: GainNode }, buffer: AudioBuffer, when: number, level: number) {
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const gain = audio.ctx.createGain();
  gain.gain.value = level;
  src.connect(gain);
  gain.connect(audio.input);
  src.start(when);
}

export class GuitarVoice {
  private readonly buffers = new Map<number, AudioBuffer>();
  private at = 0;

  constructor(private readonly audio: SceneAudio) {}

  /** Plays the next note of the tune. */
  playNext(): void {
    const a = this.audio.ready();
    if (!a) return;
    const step = GUITAR_TUNE[this.at];
    const t = a.ctx.currentTime + 0.01;
    play(a, this.string(a.ctx, step.note), t, 0.55);
    if (step.bass !== undefined) play(a, this.string(a.ctx, step.bass), t, 0.32);
    // A slow strum, low to high.
    step.chord?.forEach((n, i) => play(a, this.string(a.ctx, n), t + 0.06 + i * 0.07, 0.3));
    this.at = (this.at + 1) % GUITAR_TUNE.length;
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
}

export class TrainVoice {
  private readonly bells = new Map<number, AudioBuffer>();
  private chuffBuf: AudioBuffer | null = null;
  private at = 0;
  private lastNote = 0;

  constructor(private readonly audio: SceneAudio) {}

  /** The train ran another stretch: the next note (never two closer than 90 ms) and a chuff. */
  step(): boolean {
    const a = this.audio.ready();
    if (!a) return false;
    const now = a.ctx.currentTime;
    if (now - this.lastNote < 0.09) return false;
    this.lastNote = now;
    const s = TRAIN_TUNE[this.at];
    const t = now + 0.01;
    play(a, this.bell(a.ctx, s.note), t, 0.42);
    if (s.bass !== undefined) play(a, this.bell(a.ctx, s.bass + 12), t, 0.22);
    s.chord?.forEach((n, i) => play(a, this.bell(a.ctx, n + 12), t + 0.05 + i * 0.05, 0.2));
    play(a, this.chuff(a.ctx), t, 0.1);
    this.at = (this.at + 1) % TRAIN_TUNE.length;
    return true;
  }

  /** "Toot toot". */
  whistle(): void {
    const a = this.audio.ready();
    if (!a) return;
    const t = a.ctx.currentTime + 0.01;
    for (const [start, dur] of [
      [0, 0.22],
      [0.3, 0.42],
    ]) {
      for (const f of [freq(N.A5), freq(N.C6 + 1)]) {
        const osc = a.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * 0.97, t + start);
        osc.frequency.linearRampToValueAtTime(f, t + start + 0.05);
        const g = a.ctx.createGain();
        g.gain.setValueAtTime(0, t + start);
        g.gain.linearRampToValueAtTime(0.08, t + start + 0.03);
        g.gain.setValueAtTime(0.08, t + start + dur - 0.06);
        g.gain.linearRampToValueAtTime(0, t + start + dur);
        osc.connect(g);
        g.connect(a.input);
        osc.start(t + start);
        osc.stop(t + start + dur + 0.02);
      }
    }
  }

  /** A music-box tine: a sine with a bright inharmonic partial, a quick ping, a long ring. */
  private bell(ctx: AudioContext, midi: number): AudioBuffer {
    const cached = this.bells.get(midi);
    if (cached) return cached;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 1.6);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const f = freq(midi);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.002) * Math.exp(-t * 3.2);
      const ping = Math.exp(-t * 22);
      d[i] = 0.6 * env * (Math.sin(2 * Math.PI * f * t) + 0.35 * ping * Math.sin(2 * Math.PI * f * 4.2 * t));
    }
    this.bells.set(midi, buf);
    return buf;
  }

  /** A soft steam puff: band-passed noise, short. */
  private chuff(ctx: AudioContext): AudioBuffer {
    if (this.chuffBuf) return this.chuffBuf;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.14);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      lp = lp * 0.82 + (Math.random() * 2 - 1) * 0.18;
      d[i] = lp * 3 * Math.min(1, t / 0.01) * Math.exp(-t * 24);
    }
    this.chuffBuf = buf;
    return buf;
  }
}

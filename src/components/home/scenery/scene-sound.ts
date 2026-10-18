/**
 * Sounds of the home page's hidden toys, all synthesised (nothing is downloaded) through one
 * shared room: a warm low-pass and a soft reverb. The AudioContext starts on the first click
 * or drag (browsers allow sound after a gesture).
 *
 * One song arranged for two instruments: a slow, original night lullaby in C (SONG) with a
 * music-box melody in a real rhythm and a fingerpicked guitar part, one note a beat, on the
 * same chords and the same beat (BEAT_S).
 * - The toy train plays it: while it runs the song goes on (TrainVoice.drive), faster when it
 *   runs faster, slower when it slows (`rate`), the chuff on every beat; when it stops the song
 *   waits, and goes on when it runs again. Both parts follow the same clock, so they stay
 *   together at any speed.
 *   A click without a drag blows its whistle.
 * - The guitar joins the train: once the train has run over it, its part plays along on the
 *   same beat (warm notes that ring on, with a gentle vibrato); it drops out a while after the
 *   train leaves it.
 * - The guitar alone: each click plays the next melody note on the guitar, a bass on each bar.
 * The song starts over when it ends.
 */

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// Notes by name (MIDI, 60 = middle C).
const N = {
  D2: 38, E2: 40, F2: 41, G2: 43, A2: 45, B2: 47, C3: 48, D3: 50, E3: 52, F3: 53, G3: 55,
  A3: 57, B3: 59, C4: 60, E4: 64, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77,
  G5: 79, A5: 81, B5: 83, C6: 84,
} as const;

/** The song's tempo at the train's usual pace: 72 beats a minute (TrainVoice.drive scales it). */
const BEAT_S = 60 / 72;

interface Bar {
  /** The guitar part, one note a beat: root, fifth, a tenth, a colour note. */
  picking: [number, number, number, number];
  /** The melody: [note, length in beats], filling the bar's 4 beats. */
  melody: [number, number][];
}

/**
 * "Đom đóm" (fireflies), original. Cmaj7 – Am7 – Fmaj7 – G6 – Em7 – Am7 – Dm7 – G7, then home
 * to C. Every melody note is a chord tone or a step between two.
 */
const SONG: Bar[] = [
  { picking: [N.C3, N.G3, N.E4, N.B3], melody: [[N.E5, 1], [N.D5, 0.5], [N.E5, 0.5], [N.G5, 2]] }, // Cmaj7
  { picking: [N.A2, N.E3, N.C4, N.G3], melody: [[N.C5, 1], [N.B4, 0.5], [N.C5, 0.5], [N.E5, 2]] }, // Am7
  { picking: [N.F2, N.C3, N.A3, N.E3], melody: [[N.A4, 1], [N.C5, 1], [N.F5, 1], [N.E5, 1]] }, // Fmaj7
  { picking: [N.G2, N.D3, N.B3, N.E3], melody: [[N.D5, 1], [N.B4, 1], [N.G4, 2]] }, // G6
  { picking: [N.E2, N.B2, N.G3, N.D3], melody: [[N.G4, 1], [N.B4, 0.5], [N.E5, 0.5], [N.D5, 2]] }, // Em7
  { picking: [N.A2, N.E3, N.C4, N.G3], melody: [[N.C5, 1], [N.E5, 1], [N.A5, 1], [N.G5, 1]] }, // Am7
  { picking: [N.D2, N.A2, N.F3, N.C3], melody: [[N.F5, 1], [N.E5, 0.5], [N.D5, 0.5], [N.C5, 2]] }, // Dm7
  { picking: [N.G2, N.D3, N.B3, N.F3], melody: [[N.B4, 1], [N.D5, 1], [N.G5, 1], [N.F5, 1]] }, // G7
];
/** Home: the last note held a whole bar, with the C chord rolled. */
const ENDING = { note: N.E5, chord: [N.C3, N.G3, N.C4, N.E4, N.G4] };
const SONG_BEATS = (SONG.length + 1) * 4;

type SongEvent =
  | { beat: number; kind: 'melody'; note: number; bass?: number }
  | { beat: number; kind: 'guitar'; note: number; root: boolean }
  | { beat: number; kind: 'chuff' }
  | { beat: number; kind: 'end' };

/** The whole arrangement on one time line (beats), in order. */
const EVENTS: SongEvent[] = (() => {
  const out: SongEvent[] = [];
  SONG.forEach((bar, i) => {
    let beat = i * 4;
    bar.melody.forEach(([note, len], j) => {
      out.push({ beat, kind: 'melody', note, ...(j === 0 ? { bass: bar.picking[0] } : {}) });
      beat += len;
    });
    bar.picking.forEach((note, b) => out.push({ beat: i * 4 + b, kind: 'guitar', note, root: b === 0 }));
  });
  const home = SONG.length * 4;
  out.push({ beat: home, kind: 'melody', note: ENDING.note, bass: ENDING.chord[0] }, { beat: home, kind: 'end' });
  for (let b = 0; b < SONG_BEATS; b++) out.push({ beat: b, kind: 'chuff' });
  return out.sort((x, y) => x.beat - y.beat);
})();

/** The guitar alone plays the melody, click by click. */
const MELODY = EVENTS.filter((e): e is Extract<SongEvent, { kind: 'melody' }> => e.kind === 'melody');

/** The shared room every sound goes through. */
export class SceneAudio {
  private ctx: AudioContext | null = null;
  private input: GainNode | null = null;
  private unlocked = false;

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
      // The visitor chose to play: music, not ambience (on iPhone, the silent switch would mute
      // ambience). Only where the browser offers it.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
    }
    // 'suspended', or iOS's 'interrupted'.
    if (this.ctx.state !== 'running') void this.ctx.resume();
    return { ctx: this.ctx, input: this.input! };
  }

  /**
   * At the end of a gesture (touchend, pointerup, click), once a toy has been played: iOS web
   * views (Chrome on iPhone) only let the sound out from there, not from the touch's start.
   * Resumes the context and plays one silent sample inside the gesture, which opens the output;
   * notes already scheduled then sound.
   */
  unlock(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state !== 'running') void ctx.resume();
    if (this.unlocked && ctx.state === 'running') return;
    this.unlocked = true;
    const tick = ctx.createBufferSource();
    tick.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    tick.connect(ctx.destination);
    tick.start(0);
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

function play(
  audio: { ctx: AudioContext; input: GainNode },
  buffer: AudioBuffer,
  when: number,
  level: number,
): AudioBufferSourceNode {
  const src = audio.ctx.createBufferSource();
  src.buffer = buffer;
  const gain = audio.ctx.createGain();
  gain.gain.value = level;
  src.connect(gain);
  gain.connect(audio.input);
  src.start(when);
  return src;
}

/** A singer's vibrato on a ringing note: straight at first, then a gentle waver (in cents). */
function vibrato(audio: { ctx: AudioContext }, src: AudioBufferSourceNode, when: number) {
  const lfo = audio.ctx.createOscillator();
  lfo.frequency.value = 5;
  const depth = audio.ctx.createGain();
  depth.gain.setValueAtTime(0, when);
  depth.gain.linearRampToValueAtTime(0, when + 0.45);
  depth.gain.linearRampToValueAtTime(14, when + 1.4);
  lfo.connect(depth);
  depth.connect(src.detune);
  lfo.start(when);
  const end = when + (src.buffer?.duration ?? 5);
  lfo.stop(end);
}

export class GuitarVoice {
  private readonly buffers = new Map<number, AudioBuffer>();
  private at = 0;

  constructor(private readonly audio: SceneAudio) {}

  /** Plays the next melody note of the song, a bass on the first note of a bar. */
  playNext(): void {
    const a = this.audio.ready();
    if (!a) return;
    const step = MELODY[this.at];
    const t = a.ctx.currentTime + 0.01;
    play(a, this.string(a.ctx, step.note), t, 0.5);
    if (step.bass !== undefined) play(a, this.string(a.ctx, step.bass), t, 0.3);
    // Home: a slow roll, low to high.
    if (this.at === MELODY.length - 1)
      ENDING.chord.forEach((n, i) => play(a, this.string(a.ctx, n), t + 0.06 + i * 0.08, 0.28));
    this.at = (this.at + 1) % MELODY.length;
  }

  /**
   * One string, now or a little later (the train's duet uses it). `warm`: plucked with the flesh
   * of the finger, darker and longer. `sing`: warmer still, ringing on with a gentle vibrato.
   */
  pluck(midi: number, level: number, delay = 0, warm = false, sing = false): void {
    const a = this.audio.ready();
    if (!a) return;
    const when = a.ctx.currentTime + 0.01 + delay;
    const src = play(a, this.string(a.ctx, midi, warm || sing, sing), when, level);
    if (sing) vibrato(a, src, when);
  }

  /** A strum, low to high. */
  strum(notes: number[], level: number, spread = 0.045, warm = false): void {
    notes.forEach((n, i) => this.pluck(n, level, i * spread, warm));
  }

  /** Karplus–Strong: a burst of soft noise circulating in a delay line the length of one period. */
  private string(ctx: AudioContext, midi: number, warm = false, long = false): AudioBuffer {
    const key = midi + (long ? 2000 : warm ? 1000 : 0);
    const cached = this.buffers.get(key);
    if (cached) return cached;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * (long ? 5.5 : warm ? 3.6 : 3));
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq(midi)));
    const ring = new Float32Array(period);
    // Softened noise: a finger, not a pick (warmer still for the duet).
    const soft = warm ? 0.82 : 0.5;
    let prev = 0;
    for (let i = 0; i < period; i++) {
      prev = prev * soft + (Math.random() * 2 - 1) * (1 - soft);
      ring[i] = prev;
    }
    // High strings ring a little shorter; the warm voice sings longer.
    const decay = Math.min(
      long ? 0.99965 : 0.9993,
      0.9985 - Math.min(0.004, (midi - 40) * 0.00006) + (long ? 0.001 : warm ? 0.0006 : 0),
    );
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
    this.buffers.set(key, buf);
    return buf;
  }
}

export class TrainVoice {
  private readonly bells = new Map<number, AudioBuffer>();
  private chuffBuf: AudioBuffer | null = null;
  /** Where the song is (beats) and the next event to play. */
  private beat = -0.001;
  private next = 0;

  constructor(
    private readonly audio: SceneAudio,
    private readonly guitar: GuitarVoice,
  ) {}

  /** The chord the song is on right now (the guitar part's notes), low to high. */
  chord(): number[] {
    const bar = Math.floor(Math.max(0, this.beat) / 4);
    return [...(SONG[bar]?.picking ?? ENDING.chord)].sort((x, y) => x - y);
  }

  /**
   * Called every frame. While the train `runs`, the song moves on, `rate` times its tempo (the
   * train's speed), and every event it passes is scheduled at its exact time; when the train
   * stands, the song waits. `together`: the guitar's part plays too. Returns the beats passed
   * (the chimney puffs on them).
   */
  drive(dt: number, runs: boolean, together: boolean, rate = 1): number {
    if (!runs) return 0;
    const a = this.audio.ready();
    if (!a) return 0;
    const now = a.ctx.currentTime + 0.02;
    const beatS = BEAT_S / rate;
    let from = this.beat;
    let left = dt / beatS;
    let offset = 0;
    let beats = 0;
    // At most a wrap or two a frame; a tiny float remainder must not loop forever.
    for (let rounds = 0; left > 1e-6 && rounds < 4; rounds++) {
      const to = Math.min(SONG_BEATS, from + left);
      for (let e = EVENTS[this.next]; e && e.beat <= to; e = EVENTS[++this.next]) {
        if (e.beat <= from && from >= 0) continue;
        const at = now + offset + Math.max(0, e.beat - from) * beatS;
        if (e.kind === 'chuff') {
          play(a, this.chuff(a.ctx), at, together ? 0.035 : 0.07);
          beats++;
        } else if (e.kind === 'melody') {
          play(a, this.bell(a.ctx, e.note), at, together ? 0.36 : 0.42);
          // Alone, the music box keeps a soft root an octave up on each bar.
          if (!together && e.bass !== undefined) play(a, this.bell(a.ctx, e.bass + 24), at, 0.14);
        } else if (e.kind === 'guitar') {
          if (together) this.guitar.pluck(e.note, e.root ? 0.28 : 0.22, at - a.ctx.currentTime, true, true);
        } else if (together) {
          ENDING.chord.forEach((n, i) => this.guitar.pluck(n, 0.2, at - a.ctx.currentTime + i * 0.14, true, true));
        } else {
          ENDING.chord.forEach((n, i) => play(a, this.bell(a.ctx, n + 12), at + 0.08 + i * 0.1, 0.14));
        }
      }
      left -= to - from;
      offset += (to - from) * beatS;
      from = to;
      // The end of the song: round again.
      if (to >= SONG_BEATS) {
        from = -0.001;
        this.next = 0;
      }
    }
    this.beat = from;
    return beats;
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

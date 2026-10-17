import type { Lang, SpeechView } from '@/contracts';
import { SERVER_URL } from '@/lib/socket';

/** The Edge mp3 the server made for a wish or an MC line. */
export function ttsUrl(key: string): string {
  return `${SERVER_URL}/api/tts/${key}.mp3`;
}

/** A server from before Edge voices sends only the text: read it with the browser voice. */
export function legacySpeech(text: string | null | undefined): SpeechView | null {
  return text ? { text, audio: null, lang: 'vi' } : null;
}

let currentAudio: HTMLAudioElement | null = null;
/** Chrome may garbage-collect a pending utterance and never fire onend; keep a reference. */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/** Stops whatever is being read (a new song starts). */
export function stopSpeech(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  currentUtterance = null;
}

/**
 * Reads a wish / MC line on the speaker (R-34) and on "Nghe cùng" devices: the Edge mp3 when
 * the server has it, else — or when it cannot load or play — the browser's own voice.
 * `volume` 0–100. Returns false only when this browser can do neither.
 */
export function playSpeech(s: SpeechView, volume: number, onDone: () => void): boolean {
  stopSpeech();
  if (!s.audio || typeof Audio === 'undefined') return speakText(s.text, s.lang, onDone);
  const audio = new Audio(ttsUrl(s.audio));
  currentAudio = audio;
  audio.volume = Math.max(0, Math.min(1, volume / 100));
  let fellBack = false;
  const fallBack = () => {
    if (fellBack || currentAudio !== audio) return;
    fellBack = true;
    currentAudio = null;
    if (!speakText(s.text, s.lang, onDone)) onDone();
  };
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
    onDone();
  };
  audio.onerror = fallBack;
  audio.play().catch(fallBack);
  return true;
}

/** The browser voice for the line's language (vi-VN / en-US), no pitch or rate tricks. */
export function speakText(text: string, lang: Lang, onDone: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[player] speechSynthesis not supported — line skipped');
    return false;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'en' ? 'en-US' : 'vi-VN';
  const prefix = lang === 'en' ? 'en' : 'vi';
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(prefix));
  if (voice) u.voice = voice;
  u.onend = onDone;
  u.onerror = onDone;
  currentUtterance = u;
  window.speechSynthesis.speak(u);
  return currentUtterance !== null;
}

/** A line whose Edge mp3 is still being made is held this long, then read with the browser voice. */
const HOLD_MS = 8000;

type CueIo = {
  /** Lowers the song while the line is read, and brings it back. */
  duck(): void;
  restore(): void;
  /** Speaker / listen-along volume, 0–100. */
  volume(): number;
};

/**
 * One song's wish / MC line, read once: the Edge mp3 when it is there; when the server says
 * it is still being made (`pending`), held up to HOLD_MS for it (the song is never held), then
 * the browser voice. The song stays ducked while the line is read, with a safety net if
 * neither voice reports the end (~150 ms per character, at least 8 s).
 */
export class SpeechCue {
  private itemId: string | null = null;
  private done = true;
  private hold: ReturnType<typeof setTimeout> | null = null;
  private safety: ReturnType<typeof setTimeout> | null = null;
  /** Bumped on every reset: a late onend / onerror from an older line is ignored. */
  private gen = 0;

  constructor(private readonly io: CueIo) {}

  /** A new song. `canRead`: it plays and has only just started (the line belongs to its start). */
  begin(itemId: string | null, s: SpeechView | null, canRead: boolean): void {
    this.reset();
    this.itemId = itemId;
    if (!s || !canRead) return;
    this.done = false;
    if (s.audio || !s.pending) this.read(s);
    else this.hold = setTimeout(() => this.read({ ...s, audio: null }), HOLD_MS);
  }

  /** The same song again (updated command / snapshot): its mp3 may have just arrived. */
  update(itemId: string | null, s: SpeechView | null | undefined): void {
    if (this.done || itemId !== this.itemId || !s?.audio) return;
    this.read(s);
  }

  /** This device stops reading (lease lost, listen-along off): silence and full volume. */
  stop(): void {
    const reading = this.safety !== null;
    this.reset();
    if (reading) this.io.restore();
  }

  private read(s: SpeechView): void {
    if (this.hold) clearTimeout(this.hold);
    this.hold = null;
    this.done = true;
    const gen = this.gen;
    const restore = () => {
      if (gen !== this.gen) return;
      if (this.safety) clearTimeout(this.safety);
      this.safety = null;
      this.io.restore();
    };
    if (!playSpeech(s, this.io.volume(), restore)) return;
    this.io.duck();
    this.safety = setTimeout(restore, Math.max(8000, s.text.length * 150));
  }

  private reset(): void {
    if (this.hold) clearTimeout(this.hold);
    if (this.safety) clearTimeout(this.safety);
    this.hold = null;
    this.safety = null;
    this.done = true;
    this.gen += 1;
    stopSpeech();
  }
}

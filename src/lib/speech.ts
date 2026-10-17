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

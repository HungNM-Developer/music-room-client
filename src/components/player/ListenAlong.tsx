'use client';

import { Headphones, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { estimatePosition } from '@/lib/time';
import { legacySpeech, SpeechCue } from '@/lib/speech';
import { IdleCover } from './IdleCover';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { DJ_FILES, DRIFT_SEC, DUCK_VOLUME, type PlayerAdapter, playDj, preloadDj, TapVideoHint, YouTubeAdapter } from './PlayerEngine';

// N1 "Nghe cùng": this device plays the room's song in sync, for itself only. It follows
// the room snapshot (song, play / pause, position on the server clock) — the same clock
// the speaker follows — never claims the player lease and never reports back.

const VOLUME_KEY = 'mr:listen-volume';
const CHECK_MS = 4000;

let listening = false;
let volume = 80;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function readVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 100 ? v : 80;
  } catch {
    return 80;
  }
}

export const useListening = () => useSyncExternalStore(subscribe, () => listening, () => false);
export const useListenVolume = () => useSyncExternalStore(subscribe, () => volume, () => 80);

/** Turns "Nghe cùng" on or off for this device (and tells the room, for the 🎧 list). */
export function setListening(on: boolean): void {
  if (on === listening) return;
  listening = on;
  if (on) volume = readVolume();
  emit();
  void room.send('listen:set', { on });
}

export function setListenVolume(v: number): void {
  volume = Math.max(0, Math.min(100, Math.round(v)));
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // private mode: keep it for this visit only
  }
  emit();
}

/** The "🎧 Nghe cùng" toggle for the now-playing card. */
export function ListenButton() {
  const t = useT();
  const on = useListening();
  return (
    <Button size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => setListening(!on)}>
      <Headphones className="h-4 w-4" aria-hidden />
      {on ? t.listen.on : t.listen.start}
    </Button>
  );
}

export function ListenVolume({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const v = useListenVolume();
  return (
    <label className={`flex items-center gap-2 text-[13px] text-sage ${compact ? '' : 'min-h-11'}`}>
      <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">{t.listen.volume}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={v}
        onChange={(e) => setListenVolume(Number(e.target.value))}
        className="w-full accent-amber"
      />
    </label>
  );
}

/**
 * Once per room page (not per layout: themes remount their player box): re-announce
 * listening after a reconnect, and stop it when the page is left.
 */
export function useListenSession(): void {
  const on = useListening();
  const connectCount = useRoom((s) => s.connectCount);
  const connection = useRoom((s) => s.connection);
  const isPlayer = useMe()?.canPlay ?? false;

  // This device became the room's speaker (e.g. an admin made themselves the player): it now
  // plays for everyone, so its own "Nghe cùng" stops — otherwise the song plays twice.
  useEffect(() => {
    if (on && isPlayer) setListening(false);
  }, [on, isPlayer]);
  // The server forgets listeners on disconnect: say it again after every reconnect.
  useEffect(() => {
    if (on && connection === 'connected') void room.send('listen:set', { on: true });
  }, [on, connection, connectCount]);
  // Leaving the room page stops it.
  useEffect(() => () => setListening(false), []);
}

/** The visible player while "Nghe cùng" is on (placed by each layout). */
export function ListenAlong() {
  const on = useListening();
  if (!on) return null;
  return <ListenPlayer />;
}

function ListenPlayer() {
  const t = useT();
  const np = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const offset = useRoom((s) => s.offset);
  const vol = useListenVolume();
  const adapterRef = useRef<PlayerAdapter | null>(null);
  // Counts ready YouTube players: a rebuilt iframe (StrictMode, remount) must get the song again.
  const [ready, setReady] = useState(0);
  const itemRef = useRef<string | null>(null);
  const npRef = useRef(np);
  const statusRef = useRef<string | null>(null);
  // This song has really played here, and the listener then paused it with the video's own ⏸.
  // Only that pause is left alone; anything else (autoplay blocked, not loaded yet) is retried.
  const playedRef = useRef(false);
  const userPausedRef = useRef(false);
  // The room plays but this browser blocked the video (phones: only a tap on ▶ starts it).
  const [needsTap, setNeedsTap] = useState(false);
  const offsetRef = useRef(offset);
  const volRef = useRef(vol);
  // The wish of the song now playing, read here too (the MC line only goes to the speaker).
  const cueRef = useRef<SpeechCue | null>(null);
  useEffect(() => {
    const cue = new SpeechCue({
      duck: () => adapterRef.current?.setVolume(Math.min(volRef.current, DUCK_VOLUME)),
      restore: () => adapterRef.current?.setVolume(volRef.current),
      volume: () => volRef.current,
    });
    cueRef.current = cue;
    return () => cue.stop();
  }, []);
  const [touch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    npRef.current = np;
    offsetRef.current = offset;
  }, [np, offset]);

  // Follow the room: new song → load at the room's position; pause / play; drift → seek.
  useEffect(() => {
    const a = adapterRef.current;
    if (!a || !ready) return;
    if (!np) {
      a.pause();
      itemRef.current = null;
      return;
    }
    const expected = estimatePosition({ ...np, durationSec: np.item.track.durationSec }, offset, Date.now());
    const resumed = np.status === 'PLAYING' && statusRef.current !== 'PLAYING';
    statusRef.current = np.status;
    if (np.item.id !== itemRef.current) {
      itemRef.current = np.item.id;
      playedRef.current = false;
      userPausedRef.current = false;
      cueRef.current?.stop();
      a.setVolume(volRef.current);
      a.load(np.item.track.externalId, expected, np.status === 'PLAYING');
      const speech = np.item.wishSpeech ?? legacySpeech(np.item.wishMessage);
      cueRef.current?.begin(np.item.id, speech, np.status === 'PLAYING' && expected < 3);
      return;
    }
    // Same song: its wish's Edge audio may have just arrived; paused meanwhile, it is dropped.
    if (np.status === 'PAUSED') cueRef.current?.stop();
    else cueRef.current?.update(np.item.id, np.item.wishSpeech);
    if (np.status === 'PAUSED') a.pause();
    else {
      if (resumed) userPausedRef.current = false; // the room starting again brings everyone back
      if (userPausedRef.current) return;
      if (Math.abs(a.currentTime() - expected) > DRIFT_SEC) a.seek(expected);
      a.play();
    }
  }, [np, offset, ready]);

  // Pausing the video here (the iframe must stay clickable, YouTube policy) is this listener's
  // own choice and is left alone. Whenever it plays — their ▶, or the room starting again —
  // jump to where the room is. ▶ while the room is paused is undone: nothing to listen to.
  const catchUp = useCallback(() => {
    const a = adapterRef.current;
    const cur = npRef.current;
    if (!a || !cur || cur.item.id !== itemRef.current || a.state() !== 1) return;
    if (cur.status !== 'PLAYING') return a.pause();
    const expected = estimatePosition({ ...cur, durationSec: cur.item.track.durationSec }, offsetRef.current, Date.now());
    if (Math.abs(a.currentTime() - expected) > DRIFT_SEC) a.seek(expected);
  }, []);
  const onPlaying = useCallback(() => {
    playedRef.current = true;
    setNeedsTap(false);
    userPausedRef.current = false;
    catchUp();
  }, [catchUp]);
  const onPaused = useCallback(() => {
    const cur = npRef.current;
    // Our own pause (the room paused) never counts: by then the room already says PAUSED.
    if (playedRef.current && cur?.status === 'PLAYING' && cur.item.id === itemRef.current) userPausedRef.current = true;
  }, []);

  // Every few seconds: keep up while playing (ads, buffering, a sleepy tab), and keep trying to
  // start when the room plays but this device does not yet (autoplay blocked, slow load) —
  // unless the listener paused it themselves.
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const a = adapterRef.current;
      const cur = npRef.current;
      if (!a || !cur || cur.item.id !== itemRef.current) return;
      const s = a.state();
      if (s === 1) return catchUp();
      const wanted = cur.status === 'PLAYING' && !userPausedRef.current;
      setNeedsTap(wanted && (s === -1 || s === 5));
      if (wanted && s !== 3 && s !== 0) a.play();
    }, CHECK_MS);
    return () => clearInterval(t);
  }, [ready, catchUp]);

  useEffect(() => {
    volRef.current = vol;
    adapterRef.current?.setVolume(vol);
  }, [vol]);

  // DJ sounds, like in the office.
  useEffect(() => {
    preloadDj();
    return room.onDj((e) => {
      const src = DJ_FILES[e.soundType];
      if (src) playDj(src);
    });
  }, []);


  return (
    <section aria-label={t.listen.title} className="space-y-3 rounded-panel border border-amber/40 bg-panel/80 p-3">
      <div className="flex items-center gap-2">
        <Headphones className="h-5 w-5 text-amber" aria-hidden />
        <p className="min-w-0 flex-1 text-[14px] font-semibold">{t.listen.title}</p>
        <Button size="sm" variant="ghost" onClick={() => setListening(false)}>
          {t.listen.stop}
        </Button>
      </div>
      {/* Visible and at least 200 px tall: YouTube API policy (TC-131). */}
      <div className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-box bg-dial-deep">
        <YouTubeAdapter
          adapterRef={adapterRef}
          onReady={() => {
            itemRef.current = null; // a new, empty player: load the room's song into it
            setReady((n) => n + 1);
          }}
          onPlaying={onPlaying}
          onPaused={onPaused}
          onAutoplayBlocked={() => setNeedsTap(true)}
          onEnded={() => {}}
          onError={() => {}}
        />
        {!np && <IdleCover />}
      </div>
      {needsTap && <TapVideoHint text={t.listen.tapVideo} />}
      <ListenVolume />
      {touch && <p className="text-[13px] text-sage">{t.listen.keepScreenOn}</p>}
    </section>
  );
}

/** N3: who plays the room on their own device right now. */
export function ListenersStrip({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const t = useT();
  const members = useRoom((s) => s.snapshot?.members);
  const me = useMe();
  const people = (members ?? []).filter((m) => m.listening && m.online);
  if (!people.length) return null;
  const shown = people.slice(0, 5);
  const big = size === 'lg';
  return (
    <div className={`flex items-center gap-2 ${big ? 'text-[16px]' : 'text-[13px]'} text-sage`}>
      <span className="flex -space-x-2">
        {shown.map((m) => (
          <span key={m.id} className="rounded-full ring-2 ring-panel" title={m.displayName}>
            <Avatar name={m.displayName} color={m.color} size={big ? 32 : 24} />
          </span>
        ))}
      </span>
      {people.length > shown.length && <span>+{people.length - shown.length}</span>}
      <span>
        <Headphones className="mr-1 inline h-4 w-4 align-[-3px] text-amber" aria-hidden />
        {people.length === 1 && people[0].id === me?.id ? t.listen.onlyYou : t.listen.count(people.length)}
      </span>
    </div>
  );
}

'use client';

import { Headphones, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { vi } from '@/i18n/vi';
import { estimatePosition } from '@/lib/time';
import { useMe, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { DJ_FILES, DRIFT_SEC, DUCK_VOLUME, type PlayerAdapter, playDj, preloadDj, speak, YouTubeAdapter } from './PlayerEngine';

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
  const on = useListening();
  return (
    <Button size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => setListening(!on)}>
      <Headphones className="h-4 w-4" aria-hidden />
      {on ? vi.listen.on : vi.listen.start}
    </Button>
  );
}

export function ListenVolume({ compact = false }: { compact?: boolean }) {
  const v = useListenVolume();
  return (
    <label className={`flex items-center gap-2 text-[13px] text-sage ${compact ? '' : 'min-h-11'}`}>
      <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">{vi.listen.volume}</span>
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

/** Mounted on the room page: the visible player while "Nghe cùng" is on. */
export function ListenAlong() {
  const on = useListening();
  const connectCount = useRoom((s) => s.connectCount);
  const connection = useRoom((s) => s.connection);

  // The server forgets listeners on disconnect: say it again after every reconnect.
  useEffect(() => {
    if (on && connection === 'connected') void room.send('listen:set', { on: true });
  }, [on, connection, connectCount]);
  // Leaving the room page stops it.
  useEffect(() => () => setListening(false), []);

  if (!on) return null;
  return <ListenPlayer />;
}

function ListenPlayer() {
  const np = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const offset = useRoom((s) => s.offset);
  const vol = useListenVolume();
  const adapterRef = useRef<PlayerAdapter | null>(null);
  const [ready, setReady] = useState(false);
  const itemRef = useRef<string | null>(null);
  const npRef = useRef(np);
  const offsetRef = useRef(offset);
  const volRef = useRef(vol);
  const duckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (np.item.id !== itemRef.current) {
      itemRef.current = np.item.id;
      if (duckTimer.current) clearTimeout(duckTimer.current);
      a.setVolume(volRef.current);
      a.load(np.item.track.externalId, expected, np.status === 'PLAYING');
      // The wish is read here too, like on the speaker (the MC line only goes to the speaker).
      const wish = np.item.wishMessage;
      if (wish && np.status === 'PLAYING' && expected < 3) {
        const restore = () => {
          if (duckTimer.current) clearTimeout(duckTimer.current);
          a.setVolume(volRef.current);
        };
        if (speak(wish, np.item.voicePreset, restore)) {
          a.setVolume(Math.min(volRef.current, DUCK_VOLUME));
          duckTimer.current = setTimeout(restore, Math.max(8000, wish.length * 150));
        }
      }
      return;
    }
    if (np.status === 'PAUSED') a.pause();
    else {
      if (Math.abs(a.currentTime() - expected) > DRIFT_SEC) a.seek(expected);
      a.play();
    }
  }, [np, offset, ready]);

  // Ads, buffering or a sleepy tab can leave us behind: catch up every few seconds.
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const a = adapterRef.current;
      const cur = npRef.current;
      if (!a || !cur || cur.status !== 'PLAYING' || cur.item.id !== itemRef.current) return;
      const expected = estimatePosition({ ...cur, durationSec: cur.item.track.durationSec }, offsetRef.current, Date.now());
      if (Math.abs(a.currentTime() - expected) > DRIFT_SEC) a.seek(expected);
    }, CHECK_MS);
    return () => clearInterval(t);
  }, [ready]);

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

  useEffect(
    () => () => {
      if (duckTimer.current) clearTimeout(duckTimer.current);
    },
    [],
  );

  return (
    <section aria-label={vi.listen.title} className="space-y-3 rounded-panel border border-amber/40 bg-panel/80 p-3">
      <div className="flex items-center gap-2">
        <Headphones className="h-5 w-5 text-amber" aria-hidden />
        <p className="min-w-0 flex-1 text-[14px] font-semibold">{vi.listen.title}</p>
        <Button size="sm" variant="ghost" onClick={() => setListening(false)}>
          {vi.listen.stop}
        </Button>
      </div>
      {/* Visible and at least 200 px tall: YouTube API policy (TC-131). */}
      <div className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-row bg-dial-deep">
        <YouTubeAdapter adapterRef={adapterRef} onReady={() => setReady(true)} onPlaying={() => {}} onEnded={() => {}} onError={() => {}} />
      </div>
      <ListenVolume />
      {touch && <p className="text-[13px] text-sage">{vi.listen.keepScreenOn}</p>}
    </section>
  );
}

/** N3: who plays the room on their own device right now. */
export function ListenersStrip({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
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
        {people.length === 1 && people[0].id === me?.id ? vi.listen.onlyYou : vi.listen.count(people.length)}
      </span>
    </div>
  );
}

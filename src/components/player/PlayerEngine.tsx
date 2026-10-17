'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube';
import { Play } from 'lucide-react';
import type { PlayerCommand, VoicePreset } from '@/contracts';
import { PLAYER_ERROR_CODES } from '@/contracts/constants';
import { PLAYER_PROGRESS_INTERVAL_MS } from '@/contracts/events';
import { vi } from '@/i18n/vi';
import { estimatePosition } from '@/lib/time';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

/** Minimal player surface the engine drives (implemented by the YouTube iframe). */
export interface PlayerAdapter {
  load(videoId: string, startSec: number, autoplay: boolean): void;
  play(): void;
  pause(): void;
  seek(sec: number): void;
  currentTime(): number;
  setVolume(v: number): void;
  /** YouTube state: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued. */
  state(): number;
}

export const DRIFT_SEC = 2.5;
export const DUCK_VOLUME = 20; // R-34

const VOICE: Record<VoicePreset, { pitch: number; rate: number }> = {
  radio: { pitch: 0.9, rate: 1.2 },
  drama: { pitch: 1.6, rate: 0.8 },
  baby: { pitch: 2.0, rate: 1.1 },
  panic: { pitch: 1.7, rate: 2.0 },
  chipmunk: { pitch: 1.9, rate: 1.3 },
  sleepy: { pitch: 0.8, rate: 0.5 },
};

export const DJ_FILES: Record<string, string> = {
  build: '/sounds/build.m4a',
  drop: '/sounds/drop.m4a',
  clap: '/sounds/clap.m4a',
  horn: '/sounds/horn.mp3',
  airhorn: '/sounds/airhorn.mp3',
  laugh: '/sounds/laugh.m4a',
  applause: '/sounds/applause.m4a',
};

/**
 * DJ sounds are fetched once (after "Bắt đầu phát") and reused. A sound that is still
 * playing is cloned so rapid taps overlap instead of restarting.
 */
const djPool = new Map<string, HTMLAudioElement>();
export function preloadDj(): void {
  for (const src of Object.values(DJ_FILES)) {
    if (djPool.has(src)) continue;
    const a = new Audio(src);
    a.preload = 'auto';
    a.volume = 0.8;
    djPool.set(src, a);
  }
}
export function playDj(src: string): void {
  const base = djPool.get(src) ?? new Audio(src);
  const a = base.paused ? base : (base.cloneNode() as HTMLAudioElement);
  a.volume = 0.8;
  a.currentTime = 0;
  a.play().catch(() => console.warn('[player] DJ sound blocked'));
}

/** Chrome may garbage-collect a pending utterance and never fire onend; keep a reference. */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/** Reads the wish aloud on the speaker (R-34) and on "Nghe cùng" devices. Returns false when TTS is unavailable. */
export function speak(text: string, preset: VoicePreset | null, onDone: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[player] speechSynthesis not supported — wish skipped');
    return false;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'vi-VN';
  const viVoice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('vi'));
  if (viVoice) u.voice = viVoice;
  const cfg = VOICE[preset ?? 'radio'];
  u.pitch = cfg.pitch;
  u.rate = cfg.rate;
  u.onend = onDone;
  u.onerror = onDone;
  currentUtterance = u;
  window.speechSynthesis.speak(u);
  return currentUtterance !== null;
}

export function PlayerEngine({ volume = 100 }: { volume?: number }) {
  const playerCommand = useRoom((s) => s.playerCommand);
  const offset = useRoom((s) => s.offset);
  const connection = useRoom((s) => s.connection);
  const connectCount = useRoom((s) => s.connectCount);
  const memberId = useRoom((s) => s.memberId);
  const send = room.send;
  const adapterRef = useRef<PlayerAdapter | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const itemRef = useRef<string | null>(null);
  const reported = useRef({ started: false, ended: false });
  const playingRef = useRef(false);
  const volumeRef = useRef(volume);
  const cmdRef = useRef<PlayerCommand | null>(null);
  const claimedKey = useRef<string | null>(null);
  const offsetRef = useRef(offset);
  const duckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Sticky user activation (e.g. "Phát ở máy này") already allows autoplay: skip the overlay.
  // Runs after hydration because the server render cannot know it.
  useEffect(() => {
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activation?.hasBeenActive) setStarted(true);
  }, []);

  // R-27: take the lease only once playback is actually possible, and again after every reconnect.
  useEffect(() => {
    if (!started || connection !== 'connected' || !memberId) return;
    const key = `${memberId}:${connectCount}`;
    if (claimedKey.current === key) return;
    claimedKey.current = key;
    void send('player:claim', {});
  }, [started, connection, connectCount, memberId, send]);

  const report = useCallback(
    (event: 'started' | 'progress' | 'ended' | 'error', extra: { positionSec?: number; errorCode?: number } = {}) => {
      const id = itemRef.current;
      if (!id) return;
      void send('player:report', { queueItemId: id, event, ...extra });
    },
    [send],
  );

  // ---------------------------------------------------------------- apply commands
  // Runs only when a new command arrives (not on every room:update), so a stale
  // command never causes forward seeks or a replay of an ended track (review P2-5).
  useEffect(() => {
    cmdRef.current = playerCommand;
    const a = adapterRef.current;
    if (!a || !ready || !started) return;
    if (!playerCommand) {
      // Lease revoked or not yet granted: this device must be silent (review P2-6).
      a.pause();
      itemRef.current = null;
      return;
    }
    const expected = estimatePosition(playerCommand, offsetRef.current, Date.now());

    if (playerCommand.queueItemId !== itemRef.current) {
      itemRef.current = playerCommand.queueItemId;
      reported.current = { started: false, ended: false };
      // Never carry a ducked volume over to the next track (review P2-7).
      if (duckTimer.current) clearTimeout(duckTimer.current);
      a.setVolume(volumeRef.current);
      if (!playerCommand.videoId) {
        a.pause();
        return;
      }
      const autoplay = playerCommand.status === 'PLAYING';
      // A wish first; otherwise the MC's line (AI3), read in the radio voice.
      const wish =
        playerCommand.wish ??
        (playerCommand.intro ? { message: playerCommand.intro, voicePreset: 'radio' as const } : null);
      a.load(playerCommand.videoId, expected, autoplay);
      if (wish && autoplay && expected < 3) {
        const restore = () => {
          if (duckTimer.current) clearTimeout(duckTimer.current);
          a.setVolume(volumeRef.current);
        };
        if (speak(wish.message, wish.voicePreset, restore)) {
          a.setVolume(DUCK_VOLUME);
          // Safety net if the browser never fires onend: ~150 ms per character, at least 8 s.
          duckTimer.current = setTimeout(restore, Math.max(8000, wish.message.length * 150));
        }
      }
      return;
    }
    if (reported.current.ended) return; // this item is over; wait for the next command
    if (playerCommand.status === 'PAUSED') a.pause();
    if (playerCommand.status === 'PLAYING') {
      if (Math.abs(a.currentTime() - expected) > DRIFT_SEC) a.seek(expected);
      a.play();
    }
  }, [playerCommand, ready, started]);

  useEffect(() => {
    volumeRef.current = volume;
    adapterRef.current?.setVolume(volume);
  }, [volume]);

  // ---------------------------------------------------------------- play / pause on the video
  // The iframe stays clickable (YouTube policy: no blocking its links or controls), so its own
  // play / pause drives the whole room, like the room's button. Our own pause() / play() never
  // gets here: the command already says the same. If the server refuses, the room's state wins.
  const followRoom = useCallback(() => {
    const a = adapterRef.current;
    const cmd = cmdRef.current;
    if (!a || !cmd?.videoId || cmd.queueItemId !== itemRef.current) return;
    if (cmd.status === 'PAUSED') a.pause();
    else a.play();
  }, []);
  const fromVideo = useCallback(
    async (status: 'PLAYING' | 'PAUSED') => {
      const a = adapterRef.current;
      const cmd = cmdRef.current;
      const itemId = cmd?.queueItemId;
      if (!a || !started || !cmd?.videoId || !itemId || itemId !== itemRef.current || reported.current.ended) return;
      if (cmd.status === status) return;
      const r = await room.withOptimistic(
        {
          kind: 'playback',
          itemId,
          status,
          positionSec: Math.max(0, a.currentTime()),
          positionAt: Date.now() + offsetRef.current,
        },
        () => send('playback:control', { action: status === 'PAUSED' ? 'pause' : 'play', queueItemId: itemId }),
      );
      if (!r.ok) followRoom();
    },
    [started, send, followRoom],
  );

  // ---------------------------------------------------------------- lease keep-alive (R-27)
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      const a = adapterRef.current;
      if (a && itemRef.current && cmdRef.current?.status === 'PLAYING') {
        report('progress', { positionSec: Math.max(0, a.currentTime()) });
      } else {
        void send('player:heartbeat', {});
      }
    }, PLAYER_PROGRESS_INTERVAL_MS);
    return () => clearInterval(t);
  }, [started, report, send]);

  // ---------------------------------------------------------------- keep the screen on
  // A sleeping screen lets the browser freeze or discard this tab, and a reloaded tab
  // cannot play until someone presses start again. The lock drops whenever the page is
  // hidden, so it is taken again on every return. Needs HTTPS; silently skipped otherwise.
  useEffect(() => {
    if (!started || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const take = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (alive) lock = next;
        else void next.release();
      } catch {
        // Denied (battery saver, insecure origin): the player still works, it may just sleep.
      }
    };
    void take();
    document.addEventListener('visibilitychange', take);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', take);
      void lock?.release().catch(() => undefined);
    };
  }, [started]);

  // ---------------------------------------------------------------- DJ sounds play here only (R-34)
  useEffect(() => {
    if (!started) return;
    preloadDj();
    return room.onDj((e) => {
      const src = DJ_FILES[e.soundType];
      if (src) playDj(src);
    });
  }, [started]);

  // ---------------------------------------------------------------- player events
  const onPlaying = useCallback(() => {
    playingRef.current = true;
    if (cmdRef.current?.status !== 'PLAYING') return void fromVideo('PLAYING'); // ▶ on the video of a paused room
    if (!reported.current.started) {
      reported.current.started = true;
      report('started', { positionSec: adapterRef.current?.currentTime() ?? 0 });
    }
  }, [report, fromVideo]);
  const onEnded = useCallback(() => {
    playingRef.current = false;
    if (!reported.current.ended) {
      reported.current.ended = true;
      report('ended');
    }
  }, [report]);
  const onError = useCallback(
    (code: number) => {
      if (reported.current.ended) return;
      reported.current.ended = true;
      const known = (PLAYER_ERROR_CODES as readonly number[]).includes(code) ? code : 5;
      report('error', { errorCode: known });
    },
    [report],
  );

  const start = () => {
    setStarted(true);
    itemRef.current = null; // re-apply the current command now that playback is allowed
    // Keep-alive: a silent looping <audio> stops background-tab throttling (kept from v1).
    const keep = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    keep.loop = true;
    keep.play().catch(() => undefined);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-panel bg-dial-deep">
      <YouTubeAdapter
        adapterRef={adapterRef}
        onReady={() => setReady(true)}
        onPlaying={onPlaying}
        onPaused={() => void fromVideo('PAUSED')}
        onEnded={onEnded}
        onError={onError}
      />
      {!started && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-dial-deep p-6 text-center"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber text-amber-ink transition-transform hover:scale-105">
            <Play className="ml-1 h-9 w-9" fill="currentColor" aria-hidden />
          </span>
          <span className="type-display text-[26px] font-bold">{vi.host.start}</span>
          <span className="max-w-xs text-[14px] text-sage">{vi.host.startNote}</span>
        </button>
      )}
    </div>
  );
}

export interface AdapterProps {
  adapterRef: React.RefObject<PlayerAdapter | null>;
  onReady: () => void;
  onPlaying: () => void;
  /** Paused, by us or by the video's own controls. */
  onPaused?: () => void;
  onEnded: () => void;
  onError: (code: number) => void;
}

/** Visible YouTube iframe (≥ 200×200, never hidden — YouTube API policy, TC-131). */
export function YouTubeAdapter({ adapterRef, onReady, onPlaying, onPaused, onEnded, onError }: AdapterProps) {
  const ytRef = useRef<YouTubePlayer | null>(null);
  // A destroyed player (unmount, StrictMode remount) throws on every call: forget it.
  useEffect(
    () => () => {
      adapterRef.current = null;
      ytRef.current = null;
    },
    [adapterRef],
  );
  return (
    <YouTube
      className="absolute inset-0 w-full h-full"
      iframeClassName="w-full h-full"
      opts={{
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      }}
      onReady={(e: YouTubeEvent) => {
        const p = e.target;
        ytRef.current = p;
        // The iframe can disappear under us (navigation, remount); never let that crash an effect.
        const safe = <A extends unknown[], R>(fn: (...a: A) => R, fallback: R) => (...a: A): R => {
          try {
            return fn(...a);
          } catch {
            return fallback;
          }
        };
        adapterRef.current = {
          load: safe((videoId: string, startSec: number, autoplay: boolean) => {
            if (autoplay) p.loadVideoById({ videoId, startSeconds: startSec });
            else p.cueVideoById({ videoId, startSeconds: startSec });
          }, undefined),
          play: safe(() => void p.playVideo(), undefined),
          pause: safe(() => void p.pauseVideo(), undefined),
          seek: safe((s: number) => void p.seekTo(s, true), undefined),
          currentTime: safe(() => Number(p.getCurrentTime?.() ?? 0), 0),
          setVolume: safe((v: number) => void p.setVolume(v), undefined),
          state: safe(() => Number(p.getPlayerState?.() ?? -1), -1),
        };
        onReady();
      }}
      onStateChange={(e: YouTubeEvent<number>) => {
        if (e.data === 1) onPlaying();
        if (e.data === 2) onPaused?.();
        if (e.data === 0) onEnded();
      }}
      onError={(e: YouTubeEvent<number>) => onError(e.data)}
    />
  );
}

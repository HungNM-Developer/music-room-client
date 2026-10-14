'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube';
import { useRoom } from '@/context/RoomContext';
import {
  PLAYER_ERROR_CODES,
  PLAYER_PROGRESS_INTERVAL_MS,
  type PlayerCommand,
  type VoicePreset,
} from '@/contracts';
import { vi } from '@/i18n/vi';
import { estimatePosition } from '@/lib/time';

/** Minimal player surface the engine drives (implemented by the YouTube iframe). */
interface PlayerAdapter {
  load(videoId: string, startSec: number, autoplay: boolean): void;
  play(): void;
  pause(): void;
  seek(sec: number): void;
  currentTime(): number;
  setVolume(v: number): void;
}

const DRIFT_SEC = 2.5;
const DUCK_VOLUME = 20; // R-34

const VOICE: Record<VoicePreset, { pitch: number; rate: number }> = {
  radio: { pitch: 0.9, rate: 1.2 },
  drama: { pitch: 1.6, rate: 0.8 },
  baby: { pitch: 2.0, rate: 1.1 },
  panic: { pitch: 1.7, rate: 2.0 },
  chipmunk: { pitch: 1.9, rate: 1.3 },
  sleepy: { pitch: 0.8, rate: 0.5 },
};

const DJ_FILES: Record<string, string> = {
  build: '/sounds/build.mp3',
  drop: '/sounds/drop.mp3',
  clap: '/sounds/clap.mp3',
  horn: '/sounds/horn.mp3',
  airhorn: '/sounds/airhorn.mp3',
  laugh: '/sounds/laugh.mp3',
  applause: '/sounds/applause.wav',
};

/** Chrome may garbage-collect a pending utterance and never fire onend; keep a reference. */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/** Reads the wish aloud on the speaker device only (R-34). Returns false when TTS is unavailable. */
function speak(text: string, preset: VoicePreset | null, onDone: () => void): boolean {
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
  const { playerCommand, offset, send, onDj, connection, connectCount, memberId } = useRoom();
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
      const wish = playerCommand.wish;
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

  // ---------------------------------------------------------------- DJ sounds play here only (R-34)
  useEffect(
    () =>
      onDj((e) => {
        const src = DJ_FILES[e.soundType];
        if (!src || !started) return;
        const audio = new Audio(src);
        audio.volume = 0.8;
        audio.play().catch(() => console.warn('[player] DJ sound blocked'));
      }),
    [onDj, started],
  );

  // ---------------------------------------------------------------- player events
  const onPlaying = useCallback(() => {
    playingRef.current = true;
    if (!reported.current.started) {
      reported.current.started = true;
      report('started', { positionSec: adapterRef.current?.currentTime() ?? 0 });
    }
  }, [report]);
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
    <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] bg-black">
      <YouTubeAdapter adapterRef={adapterRef} onReady={() => setReady(true)} onPlaying={onPlaying} onEnded={onEnded} onError={onError} />
      {!started && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-md text-white"
        >
          <span className="rounded-3xl bg-white px-8 py-4 text-lg font-black text-black">{vi.host.start}</span>
          <span className="text-sm text-slate-300">{vi.host.startNote}</span>
        </button>
      )}
    </div>
  );
}

interface AdapterProps {
  adapterRef: React.RefObject<PlayerAdapter | null>;
  onReady: () => void;
  onPlaying: () => void;
  onEnded: () => void;
  onError: (code: number) => void;
}

/** Visible YouTube iframe (≥ 200×200, never hidden — YouTube API policy, TC-131). */
function YouTubeAdapter({ adapterRef, onReady, onPlaying, onEnded, onError }: AdapterProps) {
  const ytRef = useRef<YouTubePlayer | null>(null);
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
        adapterRef.current = {
          load: (videoId, startSec, autoplay) =>
            autoplay ? p.loadVideoById({ videoId, startSeconds: startSec }) : p.cueVideoById({ videoId, startSeconds: startSec }),
          play: () => p.playVideo(),
          pause: () => p.pauseVideo(),
          seek: (s) => p.seekTo(s, true),
          currentTime: () => Number(p.getCurrentTime?.() ?? 0),
          setVolume: (v) => p.setVolume(v),
        };
        onReady();
      }}
      onStateChange={(e: YouTubeEvent<number>) => {
        if (e.data === 1) onPlaying();
        if (e.data === 0) onEnded();
      }}
      onError={(e: YouTubeEvent<number>) => onError(e.data)}
    />
  );
}

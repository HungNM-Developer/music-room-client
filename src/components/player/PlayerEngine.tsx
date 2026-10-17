'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube';
import { Hand } from 'lucide-react';
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
 * DJ sounds are fetched once (once the speaker is started) and reused. A sound that is still
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

/** `caption`: a line above the video saying this device is the room's speaker (room page). */
export function PlayerEngine({ volume = 100, caption = false }: { volume?: number; caption?: boolean }) {
  const playerCommand = useRoom((s) => s.playerCommand);
  const offset = useRoom((s) => s.offset);
  const connection = useRoom((s) => s.connection);
  const connectCount = useRoom((s) => s.connectCount);
  const memberId = useRoom((s) => s.memberId);
  const preview = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const send = room.send;
  const adapterRef = useRef<PlayerAdapter | null>(null);
  // Counts YouTube players that became ready. The iframe can be rebuilt (React StrictMode in dev,
  // a theme switch remounting the box): every new player must be told the song again, or the
  // command goes to the destroyed one and the live video just sits there.
  const [ready, setReady] = useState(0);
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

  // Phones start a YouTube video only from a tap on the video itself; a tap elsewhere on the
  // page does not count there. Known after hydration only.
  const [touch, setTouch] = useState(false);

  // Sticky user activation (e.g. "Phát ở máy này") already allows autoplay on a computer.
  // Runs after hydration because the server render cannot know it.
  useEffect(() => {
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTouch(coarse);
    if (activation?.hasBeenActive && !coarse) setStarted(true);
  }, []);

  // The room plays but the browser blocked this video after starting. Shown under the video.
  const [needsTap, setNeedsTap] = useState(false);
  // The loaded video has really played since our last load(). Loading over a playing video
  // makes YouTube report "paused" first; only a pause after real playback is someone's ⏸.
  const playedSinceLoad = useRef(false);
  // The video id currently loaded in the player, so a command for the song already playing
  // (started on its own before the lease) does not reload it — a reload makes the video flash.
  const loadedVideo = useRef<string | null>(null);
  // ▶ was pressed on the waiting video of a paused room: once the lease is ours, resume the room.
  const wantResume = useRef(false);

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
      // Lease revoked: this device must be silent (review P2-6). Not yet granted (just started
      // from ▶ on the waiting video): keep it playing, the room's command follows in a moment.
      if (itemRef.current) a.pause();
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
      const resume = wantResume.current && playerCommand.status === 'PAUSED';
      wantResume.current = false;
      const autoplay = playerCommand.status === 'PLAYING' || resume;
      // A wish first; otherwise the MC's line (AI3), read in the radio voice.
      const wish =
        playerCommand.wish ??
        (playerCommand.intro ? { message: playerCommand.intro, voicePreset: 'radio' as const } : null);
      const s = a.state();
      if (loadedVideo.current === playerCommand.videoId && (s === 1 || s === 3)) {
        // This song already plays here: keep it, only line it up with the room.
        if (!autoplay) a.pause();
        else if (!resume && Math.abs(a.currentTime() - expected) > DRIFT_SEC) a.seek(expected);
      } else {
        playedSinceLoad.current = false;
        loadedVideo.current = playerCommand.videoId;
        a.load(playerCommand.videoId, expected, autoplay);
      }
      const itemId = playerCommand.queueItemId;
      if (resume && itemId) {
        // The room resumes from where it stopped, like the room's own ▶.
        void room.withOptimistic(
          { kind: 'playback', itemId, status: 'PLAYING', positionSec: expected, positionAt: Date.now() + offsetRef.current },
          () => room.send('playback:control', { action: 'play', queueItemId: itemId }),
        );
      }
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

  // ---------------------------------------------------------------- before starting
  // Until this device really plays it holds no lease (R-27: the room keeps its own clock and
  // tells everyone the speaker waits). Its video loads the room's song at the room's position
  // and, if the room is playing, simply tries to play it: Chrome often allows that (a visited
  // site, an installed app), and then onPlaying takes the lease. When the browser says no, the
  // ▶ stays there to press — the one tap phones accept — with a hint under the video.
  const previewRef = useRef(preview);
  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);
  const previewId = preview?.item.id ?? null;
  const previewPlaying = preview?.status === 'PLAYING';
  useEffect(() => {
    const a = adapterRef.current;
    const np = previewRef.current;
    if (!a || !ready || started || !np) return;
    const at = estimatePosition({ ...np, durationSec: np.item.track.durationSec }, offsetRef.current, Date.now());
    playedSinceLoad.current = false;
    loadedVideo.current = np.item.track.externalId;
    a.load(np.item.track.externalId, at, previewPlaying);
    if (!previewPlaying) return;
    // Blocked without a word (no onAutoplayBlocked): still not playing after a moment.
    const t = setTimeout(() => {
      const s = adapterRef.current?.state();
      if (s !== 1 && s !== 3) setNeedsTap(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [ready, started, previewId, previewPlaying]);

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
      if (status === 'PAUSED' && !playedSinceLoad.current) return; // our own load, not a ⏸
      const positionSec = Math.max(0, a.currentTime());
      // The room stops exactly where this video did (the server's clock may be a little ahead).
      if (status === 'PAUSED') await send('player:report', { queueItemId: itemId, event: 'progress', positionSec });
      const r = await room.withOptimistic(
        {
          kind: 'playback',
          itemId,
          status,
          positionSec,
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
      const cmd = cmdRef.current;
      const s = a?.state() ?? -1;
      if (a && cmd?.status === 'PLAYING' && cmd.queueItemId === itemRef.current && !reported.current.ended) {
        setNeedsTap(s === -1 || s === 5);
      }
      // Only a video that really plays reports its position: the server re-anchors the room's
      // clock on it, so a stalled or blocked video would drag everyone back every 5 s.
      if (a && itemRef.current && cmdRef.current?.status === 'PLAYING' && s === 1) {
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

  const keepAlive = useRef(false);
  const start = useCallback(() => {
    setStarted(true);
    itemRef.current = null; // re-apply the current command now that playback is allowed
    if (keepAlive.current) return;
    keepAlive.current = true;
    // Keep-alive: a silent looping <audio> stops background-tab throttling (kept from v1).
    const keep = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    keep.loop = true;
    keep.play().catch(() => undefined);
  }, []);

  // ---------------------------------------------------------------- player events
  const onPlaying = useCallback(() => {
    playingRef.current = true;
    playedSinceLoad.current = true;
    setNeedsTap(false);
    // ▶ pressed on the waiting video: playback is allowed now. Take the lease; the room's
    // command then reloads the song at the room's position.
    if (!started) {
      // ▶ on the waiting video of a paused room means "play": resume the room once we lead it.
      if (previewRef.current?.status === 'PAUSED') wantResume.current = true;
      return start();
    }
    const cmd = cmdRef.current;
    if (cmd?.status !== 'PLAYING') return void fromVideo('PLAYING'); // ▶ on the video of a paused room
    // Playing again after a stall (blocked, buffering, a tap on ▶): rejoin the room where it is.
    const a = adapterRef.current;
    if (a && cmd.queueItemId === itemRef.current) {
      const expected = estimatePosition(cmd, offsetRef.current, Date.now());
      if (Math.abs(a.currentTime() - expected) > DRIFT_SEC) a.seek(expected);
    }
    if (!reported.current.started) {
      reported.current.started = true;
      report('started', { positionSec: adapterRef.current?.currentTime() ?? 0 });
    }
  }, [report, fromVideo, started, start]);
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

  // The video starts on its own when the browser allows it; otherwise (or when the room is
  // paused) its own ▶ starts this speaker. A hint says so — never over the video.
  const waitingHint = touch ? vi.host.startTouch : vi.host.start;

  return (
    <div className="space-y-2">
      {caption && (
        <p className="px-1 text-[13px] font-medium text-amber">{started ? vi.host.thisDevicePlays : vi.host.thisDeviceWaits}</p>
      )}
      <div className="relative aspect-video w-full overflow-hidden rounded-panel bg-dial-deep">
        <YouTubeAdapter
          adapterRef={adapterRef}
          onReady={() => {
            itemRef.current = null; // a new, empty player: load the current song into it
            loadedVideo.current = null;
            setReady((n) => n + 1);
          }}
          onPlaying={onPlaying}
          onPaused={() => void fromVideo('PAUSED')}
          onEnded={onEnded}
          onError={onError}
          onAutoplayBlocked={() => setNeedsTap(true)}
        />
      </div>
      {!started
        ? preview && (!previewPlaying || needsTap) && <TapVideoHint text={waitingHint} />
        : needsTap && <TapVideoHint text={vi.host.tapVideo} />}
    </div>
  );
}

/** Below the video, never over it (its controls and links must stay reachable). */
export function TapVideoHint({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-center gap-2 px-1 text-[14px] font-medium text-amber">
      <Hand className="h-4 w-4 shrink-0" aria-hidden />
      {text}
    </p>
  );
}

export interface AdapterProps {
  adapterRef: React.RefObject<PlayerAdapter | null>;
  onReady: () => void;
  onPlaying: () => void;
  /** Paused, by us or by the video's own controls. */
  onPaused?: () => void;
  /** The browser refused to start the video without a tap on it (YouTube's onAutoplayBlocked). */
  onAutoplayBlocked?: () => void;
  onEnded: () => void;
  onError: (code: number) => void;
}

/** Visible YouTube iframe (≥ 200×200, never hidden — YouTube API policy, TC-131). */
export function YouTubeAdapter({ adapterRef, onReady, onPlaying, onPaused, onEnded, onError, onAutoplayBlocked }: AdapterProps) {
  const ytRef = useRef<YouTubePlayer | null>(null);
  const blockedRef = useRef(onAutoplayBlocked);
  useEffect(() => {
    blockedRef.current = onAutoplayBlocked;
  }, [onAutoplayBlocked]);
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
        // Not wrapped by react-youtube: listen on the YouTube player itself.
        (p as unknown as { addEventListener?: (name: string, fn: () => void) => void }).addEventListener?.('onAutoplayBlocked', () => blockedRef.current?.());
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

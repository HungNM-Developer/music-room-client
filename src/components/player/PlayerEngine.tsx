'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube';
import { Hand, Speaker } from 'lucide-react';
import type { PlayerCommand } from '@/contracts';
import { PLAYER_ERROR_CODES } from '@/contracts/constants';
import { PLAYER_PROGRESS_INTERVAL_MS } from '@/contracts/events';
import { useT } from '@/i18n';
import { memberName } from '@/i18n/activity';
import { legacySpeech, SpeechCue } from '@/lib/speech';
import { FullscreenButton, useVideoFullscreen } from './FullscreenButton';
import { IdleCover } from './IdleCover';
import { PlayerCover } from './PlayerCover';
import { estimatePosition } from '@/lib/time';
import { Button } from '@/components/ui/Button';
import { HOST_RECLAIM_MS, useMe, useOtherLivePlayer, useRoom } from '@/state/hooks';
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

/**
 * `caption`: room page — the start hint under the video also says this device is the room's speaker.
 * `frameClass`: room page — the theme's frame around the video box (its speaker-screen frame, ThemeModule.host.videoClass).
 */
export function PlayerEngine({ volume = 100, caption = false, frameClass }: { volume?: number; caption?: boolean; frameClass?: string }) {
  const t = useT();
  /** The video and its bar: what goes full screen. */
  const playerRef = useRef<HTMLDivElement>(null);
  // The room has no song at all (not merely paused): the cover replaces the empty video.
  const idle = useRoom((s) => !s.snapshot?.nowPlaying);
  const playerCommand = useRoom((s) => s.playerCommand);
  const offset = useRoom((s) => s.offset);
  const connection = useRoom((s) => s.connection);
  const connectCount = useRoom((s) => s.connectCount);
  const memberId = useRoom((s) => s.memberId);
  const preview = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const isDevice = Boolean(useMe()?.isDevice);
  const other = useOtherLivePlayer();
  const otherRef = useRef(other);
  useEffect(() => {
    otherRef.current = other;
  }, [other]);
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
  // The wish / MC line of the song now playing (read once, ducking the video).
  const cueRef = useRef<SpeechCue | null>(null);
  useEffect(() => {
    const cue = new SpeechCue({
      duck: () => adapterRef.current?.setVolume(DUCK_VOLUME),
      restore: () => adapterRef.current?.setVolume(volumeRef.current),
      volume: () => volumeRef.current,
    });
    cueRef.current = cue;
    return () => cue.stop();
  }, []);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Phones start a YouTube video only from a tap on the video itself; a tap elsewhere on the
  // page does not count there. Known after hydration only.
  const [touch, setTouch] = useState(false);

  // A /host page never takes the room's sound on its own while another speaker is live (an old
  // tab, a sleeping TV waking up): it waits with a "move the sound here" button, and takes over
  // by itself once that speaker has been offline for HOST_RECLAIM_MS. A tap always takes over.
  const forceClaim = useRef(false);
  const [yieldTo, setYieldTo] = useState<string | null>(null);
  useEffect(() => {
    if (!isDevice || started) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (other) return setYieldTo(other.id);
    if (!yieldTo) return;
    const t = setTimeout(() => setYieldTo(null), HOST_RECLAIM_MS);
    return () => clearTimeout(t);
  }, [isDevice, started, other, yieldTo]);
  const waitingForOther = isDevice && !started && Boolean(other || yieldTo);

  // Sticky user activation (e.g. "Phát ở máy này", "Phát ở máy này" after being replaced)
  // already allows autoplay on a computer, and it came from a tap: take over.
  // Runs after hydration because the server render cannot know it.
  useEffect(() => {
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTouch(coarse);
    if (activation?.hasBeenActive && !coarse) {
      forceClaim.current = true;
      setStarted(true);
    }
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
    // A /host page that reconnects after another speaker took over steps back instead.
    if (isDevice && otherRef.current && !forceClaim.current) {
      adapterRef.current?.pause();
      itemRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStarted(false);
      return;
    }
    claimedKey.current = key;
    forceClaim.current = false;
    void send('player:claim', {});
  }, [started, connection, connectCount, memberId, send, isDevice]);

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
      cueRef.current?.stop();
      return;
    }
    const expected = estimatePosition(playerCommand, offsetRef.current, Date.now());

    if (playerCommand.queueItemId !== itemRef.current) {
      itemRef.current = playerCommand.queueItemId;
      reported.current = { started: false, ended: false };
      // Never carry a ducked volume over to the next track (review P2-7).
      cueRef.current?.stop();
      a.setVolume(volumeRef.current);
      if (!playerCommand.videoId) {
        a.pause();
        return;
      }
      const resume = wantResume.current && playerCommand.status === 'PAUSED';
      wantResume.current = false;
      const autoplay = playerCommand.status === 'PLAYING' || resume;
      // A wish first; otherwise the MC's line (AI3). An older server sends only the text.
      const speech = playerCommand.speech ?? legacySpeech(playerCommand.wish?.message ?? playerCommand.intro);
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
      cueRef.current?.begin(itemId, speech, autoplay && expected < 3);
      return;
    }
    // Same song: its line's Edge audio may have just arrived (it was still being made at the start).
    // Paused meanwhile: the line is dropped, never read over silence.
    if (playerCommand.status === 'PAUSED') cueRef.current?.stop();
    else cueRef.current?.update(playerCommand.queueItemId, playerCommand.speech);
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
    if (!a || !ready || started || !np || waitingForOther) return;
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
  }, [ready, started, previewId, previewPlaying, waitingForOther]);

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
  // The room page also says why this page plays: it is the room's speaker.
  // Full screen while there is something to watch (not when the room ran out of songs).
  const watching = !idle && !waitingForOther;
  const full = useVideoFullscreen(playerRef, watching);

  const waitingHint = `${caption ? `${t.host.roomSpeaker} ` : ''}${touch ? t.host.startTouch : t.host.start}`;

  // A tap on "move the sound here": take over from the other speaker right now.
  const takeOver = () => {
    forceClaim.current = true;
    setYieldTo(null);
    start();
  };

  const screen = (
    <div
      className={`player-screen relative w-full overflow-hidden ${full.expanded ? 'min-h-0 flex-1 bg-black' : 'aspect-video rounded-panel bg-dial-deep'}`}
    >
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
      {/* No song in the room: nothing is loaded, and YouTube's own ▶ would only show an error. */}
      {idle && !waitingForOther && <IdleCover forHost={!caption} />}
      {/* Nothing is loaded in the player while waiting, so this covers an empty frame. */}
      {waitingForOther && (
        <PlayerCover
          icon={<Speaker />}
          title={other ? t.host.otherPlays(other.name && memberName({ displayName: other.name, isDevice: other.isDevice }, t)) : t.host.otherLeft}
          note={t.host.autoReturn}
        >
          <Button size="sm" variant="primary" onClick={takeOver} className="pc-primary">
            {t.host.moveHere}
          </Button>
        </PlayerCover>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Always these wrappers, only their classes change: a theme switch or full screen never
          remounts the iframe. Full screen takes the video and the bar under it (its way out). */}
      <div
        ref={playerRef}
        data-covering={full.covers || undefined}
        className={full.expanded ? `player-full flex flex-col bg-black ${full.covers ? 'fixed inset-0 z-[80] h-dvh' : 'h-full w-full'}` : ''}
      >
        <div className={full.expanded ? 'flex min-h-0 flex-1' : frameClass}>{screen}</div>
        {/* YouTube's own full screen is off with its controls. */}
        {watching && (
          <div className={`flex justify-end ${full.expanded ? 'px-2 py-1' : '-mb-1'}`}>
            <FullscreenButton expanded={full.expanded} onToggle={() => void full.toggle()} />
          </div>
        )}
      </div>
      {!started
        ? !waitingForOther && preview && (!previewPlaying || needsTap) && <TapVideoHint text={waitingHint} />
        : needsTap && <TapVideoHint text={t.host.tapVideo} />}
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

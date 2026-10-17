'use client';

import { useRoomDeleted } from '@/hooks/useRoomDeleted';
import { Radio } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Backdrop } from '@/components/room/Backdrop';
import { Banners } from '@/components/room/Banners';
import { HostChat } from '@/components/room/Chat';
import { HostLyrics } from '@/components/room/Lyrics';
import { ListenersStrip } from '@/components/player/ListenAlong';
import { HeartCanvas, triggerReaction } from '@/components/room/HeartCanvas';
import { SkipVote } from '@/components/room/SkipVote';
import { LiveDial } from '@/components/room/TuningDial';
import { Button } from '@/components/ui/Button';
import { OnAirLamp } from '@/components/ui/OnAirLamp';
import { Thumb } from '@/components/ui/Thumb';
import { normalizeRoomCode } from '@/contracts/text';
import { useOrigin } from '@/hooks/useOrigin';
import { addedByLabel } from '@/lib/added-by';
import { getToken } from '@/lib/session-store';
import { useRoomMood } from '@/hooks/useRoomMood';
import { errorMessage, vi } from '@/i18n/vi';
import { HOST_RECLAIM_MS, useOtherLivePlayer, useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';
import { useShownTheme } from '@/themes/load';
import { useApplyTheme, useRoomTheme } from '@/themes/useTheme';

const PlayerEngine = dynamic(() => import('@/components/player/PlayerEngine').then((m) => m.PlayerEngine), {
  ssr: false,
  loading: () => <div className="aspect-video w-full rounded-panel bg-dial-deep" />,
});

/** /r/CODE/host — the speaker device (D8, TC-120…TC-131). */
export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? '');
  const memberId = useRoom((s) => s.memberId);
  const connection = useRoom((s) => s.connection);
  const revoked = useRoom((s) => s.revoked);
  // No PIN: any browser with the room code becomes the speaker. Registration runs
  // automatically; a failure (network, unknown room) shows the reason and a retry.
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const needsLogin = connection === 'connected' && !memberId;

  useRoomDeleted();
  useEffect(() => room.enter(code, 'host'), [code]);
  useEffect(
    () => room.onReaction((e) => triggerReaction(window.innerWidth * (0.1 + Math.random() * 0.8), window.innerHeight - 80, e.emoji)),
    [],
  );

  useEffect(() => {
    if (!needsLogin) return;
    // A saved device token resumes the same speaker: session:ready follows the connect
    // event a moment later. Registering in that gap made every reload a new device while
    // the room's player stayed the old, offline one. Register only without a token or
    // after the server rejected it (session:revoked clears it and sets `revoked`).
    if (getToken(code, 'host') && !revoked) return;
    void (async () => {
      const r = await room.send('host:register', { code });
      if (!r.ok) setFailure(errorMessage(r.error.code, r.error.params));
    })();
  }, [needsLogin, code, attempt, revoked]);

  if (needsLogin && failure) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-5 rounded-panel bg-panel p-6 text-center sm:p-8">
          <p role="alert">{failure}</p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              setFailure(null);
              setAttempt((n) => n + 1);
            }}
          >
            {vi.host.retry}
          </Button>
        </div>
      </main>
    );
  }
  if (needsLogin) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <p className="flex items-center gap-2 text-sage" role="status">
          <Radio className="h-5 w-5 text-amber motion-safe:animate-pulse" aria-hidden /> {vi.host.opening}
        </p>
      </main>
    );
  }
  return <HostScreen code={code} />;
}

function HostScreen({ code }: { code: string }) {
  const np = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const queue = useRoom((s) => s.snapshot?.queue);
  const playerRevoked = useRoom((s) => s.playerRevoked);
  const otherPlayer = useOtherLivePlayer();
  // The sound was moved to another device: once that one has been offline for a while, this
  // speaker takes the room back by itself (an office TV returns after someone's laptop leaves).
  useEffect(() => {
    if (!playerRevoked || otherPlayer) return;
    const t = setTimeout(() => room.clearPlayerRevoked(), HOST_RECLAIM_MS);
    return () => clearTimeout(t);
  }, [playerRevoked, otherPlayer]);
  const [volume, setVolume] = useState(100);
  // The speaker always wears the room's theme (never a personal choice on this browser).
  const { id: theme, mod } = useShownTheme(useRoomTheme());
  useApplyTheme(theme, mod?.fontClass);
  const Decor = mod?.Decor;
  const HostDial = mod?.HostDial;
  useRoomMood(theme === 'default');
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/r/${code}` : '';
  const next = (queue ?? []).slice(0, 3);
  const live = np?.status === 'PLAYING';
  const picker = np?.item.addedBy?.displayName;

  return (
    <main className="relative isolate min-h-dvh px-4 py-4 md:px-8 md:py-6">
      {theme === 'default' && <Backdrop height="h-dvh" />}
      {Decor && <Decor />}
      <HeartCanvas />
      <SkipVote variant="host" meter={mod?.HostVoteMeter} />
      <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <section className="min-w-0 space-y-5">
          {/* Video height follows the screen so title, dial and volume fit on one TV screen. */}
          <div className="w-full max-w-[max(360px,calc((100dvh-27rem)*16/9))]">
            {playerRevoked ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-5 rounded-panel border border-line bg-panel p-6 text-center">
                <p className="max-w-md text-[18px]">{playerRevoked === 'permission' ? vi.host.movedByAdmin : vi.host.replaced}</p>
                <Button variant="primary" onClick={() => room.clearPlayerRevoked()}>
                  {vi.host.takeBack}
                </Button>
                <p className="max-w-md text-[14px] text-sage">{vi.host.autoReturn}</p>
              </div>
            ) : (
              <PlayerEngine volume={volume} />
            )}
          </div>

          <div>
            <OnAirLamp live={live}>{live ? vi.host.onAir : np ? vi.nowPlaying.paused : vi.host.waiting}</OnAirLamp>
            <h1 className="type-display mt-3 line-clamp-2 text-[clamp(28px,4vw,56px)] font-extrabold leading-[1.02] [unicode-bidi:plaintext]">
              {np ? np.item.track.title : vi.host.idle}
            </h1>
            {np && (
              <p className="mt-2 text-[18px] text-sage">{picker ? vi.nowPlaying.pickedBy(picker) : addedByLabel(np.item)}</p>
            )}
          </div>

          {np && <HostLyrics trackId={np.item.track.id} />}

          {np?.item.wishMessage && picker && (
            <figure className="max-w-3xl border-l-[3px] border-amber pl-4">
              <figcaption className="text-[14px] text-sage">{vi.nowPlaying.wishFrom(picker)}</figcaption>
              <blockquote className="mt-1 text-[20px] leading-snug [overflow-wrap:anywhere]">{np.item.wishMessage}</blockquote>
            </figure>
          )}

          {np && (HostDial ? <HostDial /> : <LiveDial size="large" />)}

          <label className="flex max-w-sm items-center gap-3 text-[14px] text-sage">
            {vi.host.volume}
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1" />
            <span className="w-10 text-right tabular-nums">{vi.host.volumeValue(volume)}</span>
          </label>

          <Banners />
        </section>

        <aside className="space-y-7">
          <div className="host-qr rounded-panel bg-paper p-6 text-center text-dial">
            <h2 className="type-display text-[24px] font-bold">{vi.host.scan}</h2>
            <div className="mx-auto mt-4 w-fit">
              {joinUrl ? (
                // Themed: always dark on white with a quiet zone, so every phone camera reads it.
                theme === 'default' ? (
                  <QRCodeSVG value={joinUrl} size={180} fgColor="#0f2a26" bgColor="#f3ecdd" marginSize={0} title={joinUrl} />
                ) : (
                  <QRCodeSVG value={joinUrl} size={196} fgColor="#111111" bgColor="#ffffff" marginSize={2} title={joinUrl} className="rounded-md" />
                )
              ) : (
                <div className="h-[180px] w-[180px]" />
              )}
            </div>
            <p className="type-display mt-4 text-[40px] font-extrabold leading-none tracking-[0.12em]">{code}</p>
            <p className="mt-2 text-[13px] text-dial/70 [overflow-wrap:anywhere]">{joinUrl}</p>
          </div>
          <ListenersStrip size="lg" />

          <div>
            <h2 className="type-display mb-2 text-[22px] font-bold">{vi.host.next}</h2>
            {next.length === 0 ? (
              <p className="text-sage">{vi.host.nextEmpty}</p>
            ) : (
              <ol className="divide-y divide-line/70">
                {next.map((q) => (
                  <li key={q.id} className="flex items-center gap-3 py-3">
                    <Thumb url={q.track.thumbnailUrl} size={52} />
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-medium [unicode-bidi:plaintext]">{q.track.title}</p>
                      <p className="truncate text-[14px] text-sage">{addedByLabel(q)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <HostChat />
        </aside>
      </div>
    </main>
  );
}

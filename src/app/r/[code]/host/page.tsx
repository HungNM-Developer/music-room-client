'use client';

import { Radio } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Banners } from '@/components/room/Banners';
import { HostChat } from '@/components/room/Chat';
import { HeartCanvas, triggerReaction } from '@/components/room/HeartCanvas';
import { LiveDial } from '@/components/room/TuningDial';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { OnAirLamp } from '@/components/ui/OnAirLamp';
import { Thumb } from '@/components/ui/Thumb';
import { normalizeRoomCode } from '@/contracts/text';
import { useOrigin } from '@/hooks/useOrigin';
import { errorMessage, vi } from '@/i18n/vi';
import { isPin } from '@/lib/validate';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

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

  useEffect(() => room.enter(code, 'host'), [code]);
  useEffect(
    () => room.onReaction((e) => triggerReaction(window.innerWidth * (0.1 + Math.random() * 0.8), window.innerHeight - 80, e.emoji)),
    [],
  );

  if (connection === 'connected' && !memberId) return <HostLogin code={code} />;
  return <HostScreen code={code} />;
}

function HostLogin({ code }: { code: string }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await room.send('host:register', { code, pin });
    setBusy(false);
    if (!r.ok) setError(errorMessage(r.error.code, r.error.params));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <form onSubmit={register} className="w-full max-w-sm space-y-5 rounded-panel bg-panel p-6 sm:p-8">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-amber">
          <Radio className="h-5 w-5" aria-hidden /> {vi.appName}
        </p>
        <div>
          <h1 className="type-display text-[30px] font-bold leading-tight">{vi.host.title}</h1>
          <p className="mt-1 text-sage">{vi.host.pinNote}</p>
        </div>
        <Field
          label={vi.host.pin}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          autoFocus
          className="type-display text-center text-[24px] tracking-[0.5em]"
        />
        {error && (
          <p role="alert" className="rounded-row border border-onair/50 bg-onair/10 p-3 text-[14px]">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy || !isPin(pin)} className="w-full">
          {vi.host.open}
        </Button>
      </form>
    </main>
  );
}

function HostScreen({ code }: { code: string }) {
  const np = useRoom((s) => s.snapshot?.nowPlaying ?? null);
  const queue = useRoom((s) => s.snapshot?.queue);
  const playerRevoked = useRoom((s) => s.playerRevoked);
  const [volume, setVolume] = useState(100);
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/r/${code}` : '';
  const next = (queue ?? []).slice(0, 3);
  const live = np?.status === 'PLAYING';
  const picker = np?.item.addedBy?.displayName;

  return (
    <main className="min-h-dvh px-4 py-4 md:px-8 md:py-6">
      <HeartCanvas />
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
              <p className="mt-2 text-[18px] text-sage">{picker ? vi.nowPlaying.pickedBy(picker) : vi.nowPlaying.fallback}</p>
            )}
          </div>

          {np?.item.wishMessage && picker && (
            <figure className="max-w-3xl border-l-[3px] border-amber pl-4">
              <figcaption className="text-[14px] text-sage">{vi.nowPlaying.wishFrom(picker)}</figcaption>
              <blockquote className="mt-1 text-[20px] leading-snug [overflow-wrap:anywhere]">{np.item.wishMessage}</blockquote>
            </figure>
          )}

          {np && <LiveDial size="large" />}

          <label className="flex max-w-sm items-center gap-3 text-[14px] text-sage">
            {vi.host.volume}
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1" />
            <span className="w-10 text-right tabular-nums">{vi.host.volumeValue(volume)}</span>
          </label>

          <Banners />
        </section>

        <aside className="space-y-7">
          <div className="rounded-panel bg-paper p-6 text-center text-dial">
            <h2 className="type-display text-[24px] font-bold">{vi.host.scan}</h2>
            <div className="mx-auto mt-4 w-fit">
              {joinUrl ? (
                <QRCodeSVG value={joinUrl} size={180} fgColor="#0f2a26" bgColor="#f3ecdd" marginSize={0} title={joinUrl} />
              ) : (
                <div className="h-[180px] w-[180px]" />
              )}
            </div>
            <p className="type-display mt-4 text-[40px] font-extrabold leading-none tracking-[0.12em]">{code}</p>
            <p className="mt-2 text-[13px] text-dial/70 [overflow-wrap:anywhere]">{joinUrl}</p>
          </div>

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
                      <p className="truncate text-[14px] text-sage">{q.addedBy?.displayName ?? vi.nowPlaying.fallback}</p>
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

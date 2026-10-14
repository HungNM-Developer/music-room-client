'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlayerEngine } from '@/components/player/PlayerEngine';
import { Banners } from '@/components/room/Banners';
import { HeartCanvas, triggerReaction } from '@/components/room/HeartCanvas';
import { useRoom } from '@/context/RoomContext';
import { useOrigin } from '@/hooks/useOrigin';
import { normalizeRoomCode, PinSchema } from '@/contracts';
import { errorMessage, vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';

/** /r/CODE/host — the speaker device (D8, TC-120…TC-131). */
export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? '');
  const { enter, snapshot, memberId, connection, send, playerRevoked, clearPlayerRevoked, onReaction } = useRoom();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(100);
  const origin = useOrigin();

  useEffect(() => {
    enter(code, 'host');
  }, [code, enter]);
  useEffect(
    () => onReaction((e) => triggerReaction(Math.random() * window.innerWidth, window.innerHeight - 80, e.emoji)),
    [onReaction],
  );

  async function register(e: React.FormEvent) {
    e.preventDefault();
    const r = await send('host:register', { code, pin });
    if (!r.ok) setError(errorMessage(r.error.code, r.error.params));
  }

  if (connection === 'connected' && !memberId) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-surface-900 px-4">
        <form onSubmit={register} className="w-full max-w-sm glass-effect rounded-[2rem] p-8 space-y-4">
          <h1 className="text-2xl font-black">{vi.host.title}</h1>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-400">{vi.host.pin}</span>
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} type="password" inputMode="numeric" maxLength={8} autoFocus className="w-full input-field text-center tracking-[0.5em] text-xl" />
          </label>
          {error && <p role="alert" className="text-sm text-red-200 bg-red-500/10 rounded-xl p-3">{error}</p>}
          <button type="submit" disabled={!PinSchema.safeParse(pin).success} className="w-full btn-primary disabled:opacity-50">
            {vi.host.open}
          </button>
        </form>
      </main>
    );
  }

  const joinUrl = origin ? `${origin}/r/${code}` : '';
  const np = snapshot?.nowPlaying;
  const next = snapshot?.queue.slice(0, 2) ?? [];

  return (
    <main className="min-h-dvh bg-[#05050b] text-white p-4 md:p-8">
      <HeartCanvas />
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 min-w-0 space-y-4">
          {playerRevoked ? (
            <div className="aspect-video rounded-[2rem] glass-effect flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-lg">
                {playerRevoked === 'permission' ? vi.host.movedByAdmin : vi.host.replaced}
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => clearPlayerRevoked()}
              >
                {vi.host.takeBack}
              </button>
            </div>
          ) : (
            <PlayerEngine volume={volume} />
          )}
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-black truncate">
                {np ? np.item.track.title : vi.host.idle}
              </h1>
              {np && (
                <p className="text-slate-400">
                  {np.item.addedBy ? vi.nowPlaying.addedBy(np.item.addedBy.displayName) : vi.nowPlaying.fallback}
                  {np.item.track.durationSec ? ` · ${formatDuration(np.item.track.durationSec)}` : ''}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              {vi.host.volume}
              <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
            </label>
          </div>
          <Banners />
        </section>
        <aside className="glass-effect rounded-[2rem] p-6 space-y-5 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{vi.host.scan}</p>
          <div className="mx-auto w-fit rounded-2xl bg-white p-3">
            {joinUrl && <QRCodeSVG value={joinUrl} size={200} />}
          </div>
          <p className="text-xl font-black">{vi.host.code(code)}</p>
          <div className="text-left space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{vi.host.next}</p>
            {next.length === 0 && <p className="text-sm text-slate-500">—</p>}
            <ol className="space-y-2">
              {next.map((q) => (
                <li key={q.id} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <span className="font-semibold">{q.track.title}</span>
                  <span className="text-slate-400"> · {q.addedBy?.displayName ?? vi.nowPlaying.fallback}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}

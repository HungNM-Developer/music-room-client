'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Thumb } from '@/components/ui/Thumb';
import type { RecapView } from '@/contracts';
import { vi } from '@/i18n/vi';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

type Period = 'today' | 'week';

function sinceOf(p: Period): string {
  const d = new Date();
  if (p === 'today') d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - 7);
  return d.toISOString();
}

/** A8: what the room has played today or over the last 7 days. */
export function RecapCard() {
  const [period, setPeriod] = useState<Period>('today');
  const [recap, setRecap] = useState<RecapView | null>(null);
  // A finished song changes the numbers: refresh when the song on air changes.
  const onAir = useRoom((s) => s.snapshot?.nowPlaying?.item.id ?? null);

  useEffect(() => {
    let alive = true;
    void room.send('room:recap', { since: sinceOf(period), tzOffsetMinutes: new Date().getTimezoneOffset() }).then((r) => {
      if (alive && r.ok) setRecap(r.data);
    });
    return () => {
      alive = false;
    };
  }, [period, onAir]);

  const busiest = recap && recap.plays ? recap.byHour.indexOf(Math.max(...recap.byHour)) : -1;

  return (
    <section aria-labelledby="recap-title" className="space-y-3 rounded-panel bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recap-title" className="type-display text-[20px] font-bold">
          {vi.recap.title}
        </h2>
        <div role="group" aria-label={vi.recap.periodLabel} className="flex gap-1 rounded-full bg-dial-deep p-1">
          {(['today', 'week'] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${period === p ? 'bg-panel-hi text-paper' : 'text-sage hover:text-paper'}`}
            >
              {p === 'today' ? vi.recap.today : vi.recap.week}
            </button>
          ))}
        </div>
      </div>

      {!recap ? (
        <p role="status" className="flex items-center gap-2 text-sage">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {vi.recap.loading}
        </p>
      ) : recap.plays === 0 ? (
        <p className="text-sage">{vi.recap.empty}</p>
      ) : (
        <>
          <p className="text-[15px]">
            <strong className="type-display text-[22px]">{recap.plays}</strong> {vi.recap.plays}
            <span className="mx-2 text-line">/</span>
            <strong className="type-display text-[22px]">{recap.minutes}</strong> {vi.recap.minutes}
            {recap.skipped > 0 && (
              <>
                <span className="mx-2 text-line">/</span>
                <strong className="type-display text-[22px]">{recap.skipped}</strong> {vi.recap.skipped}
              </>
            )}
          </p>
          {recap.summary && <p className="border-l-2 border-amber pl-3 italic text-paper/90">{recap.summary}</p>}
          {busiest >= 0 && <p className="text-[13px] text-sage">{vi.recap.busiest(busiest)}</p>}

          <div>
            <h3 className="mb-1.5 text-[13px] font-medium text-sage">{vi.recap.topSongs}</h3>
            <ol className="space-y-2">
              {recap.topSongs.map((s) => (
                <li key={s.track.id} className="flex items-center gap-3">
                  <Thumb url={s.track.thumbnailUrl} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium [unicode-bidi:plaintext]">{s.track.title}</p>
                    <p className="text-[13px] sm:text-[12px] text-sage">{vi.recap.songLine(s.plays, s.hearts)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {recap.topPickers.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-[13px] font-medium text-sage">{vi.recap.topPickers}</h3>
              <ol className="space-y-1">
                {recap.topPickers.map((p) => (
                  <li key={p.member.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span className="truncate">{p.member.displayName}</span>
                    <span className="shrink-0 text-[13px] sm:text-[12px] text-sage">{vi.recap.pickerLine(p.songs, p.hearts)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}

'use client';

import { Check, SkipForward, X } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { Thumb } from '@/components/ui/Thumb';
import { vi } from '@/i18n/vi';
import { meterProps, useSkipVoteState, type VoteMeterProps } from './stage/useSkipVoteState';

/**
 * The window whose timers drive the countdown. A Picture-in-Picture window stays visible
 * while the room tab is hidden (and throttled), so its own timers keep the seconds moving.
 */
export const TimerWindowContext = createContext<Window | null>(null);

/** The clock, refreshed every `ms` while `active`, on the given window's timers. */
export function useNow(ms: number, active: boolean): number {
  const win = useContext(TimerWindowContext);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const w = win ?? window;
    const tick = () => setNow(Date.now());
    const first = w.setTimeout(tick, 0);
    const id = w.setInterval(tick, ms);
    return () => {
      w.clearTimeout(first);
      w.clearInterval(id);
    };
  }, [win, ms, active]);
  return now;
}

/**
 * V1: the skip vote everyone sees. `member`: floating card with ✅ / ❌ (compact once I
 * voted or chose "Để sau"); `host`: a large read-only banner on the speaker screen;
 * `pip`: inline in the mini player.
 */
export function SkipVote({ variant, meter: Meter }: { variant: 'member' | 'host' | 'pip'; meter?: React.ComponentType<VoteMeterProps> }) {
  const s = useSkipVoteState(variant === 'host');

  const frame =
    variant === 'member'
      ? 'pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-3'
      : variant === 'host'
        ? 'pointer-events-none fixed inset-x-0 top-6 z-[90] flex justify-center px-6'
        : '';
  const card =
    variant === 'host'
      ? 'w-full max-w-3xl rounded-panel border border-amber/60 bg-panel/95 p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]'
      : variant === 'member'
        ? 'pointer-events-auto w-full max-w-md animate-rise rounded-panel border border-amber/50 bg-panel p-3.5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.7)]'
        : 'rounded-row border border-amber/50 bg-dial-deep p-2.5';

  if (!s.open) {
    if (!s.result) return null;
    return (
      <div className={frame}>
        <div role="status" className={`${card} text-center font-semibold ${variant === 'host' ? 'text-[24px]' : 'text-[15px]'}`}>
          {s.result.kind === 'skipped' ? vi.skipVote.skipped : vi.skipVote.kept}
        </div>
      </div>
    );
  }

  const { np, votes, required, against, seconds, mine } = s;
  const host = variant === 'host';

  return (
    <div className={frame}>
      <section aria-label={vi.skipVote.label} aria-live="polite" className={card}>
        <div className="flex items-center gap-3">
          {variant !== 'pip' && <Thumb url={np.item.track.thumbnailUrl} size={host ? 64 : 44} className="rounded-row" />}
          <div className="min-w-0 flex-1">
            <p className={`leading-snug ${host ? 'text-[22px]' : 'text-[14px]'}`}>
              <SkipForward className={`mr-1.5 inline align-[-2px] text-amber ${host ? 'h-5 w-5' : 'h-4 w-4'}`} aria-hidden />
              {s.asksLabel}
            </p>
            {/* The mini player already shows the song right above. */}
            {variant !== 'pip' && (
              <p className={`truncate font-semibold [unicode-bidi:plaintext] ${host ? 'type-display text-[28px]' : 'text-[15px]'}`}>{np.item.track.title}</p>
            )}
          </div>
          <p className={`shrink-0 text-right tabular-nums ${host ? 'text-[20px]' : 'text-[13px]'}`}>
            <span className="text-online">✅ {votes}/{required}</span>
            <span className="ml-2 text-alert">❌ {against}</span>
            <span className="block text-sage">{vi.skipVote.seconds(seconds)}</span>
          </p>
        </div>

        {Meter ? (
          <div className="mt-3">
            <Meter {...meterProps(s)} />
          </div>
        ) : (
          <Drain leftMs={s.leftMs} totalMs={s.totalMs} thick={host} />
        )}

        {s.offer ? (
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <button type="button" onClick={() => s.vote(true)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-row bg-online font-semibold text-dial-deep hover:brightness-110">
              <Check className="h-5 w-5" aria-hidden />
              {vi.skipVote.yes}
            </button>
            <button type="button" onClick={() => s.vote(false)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-row bg-onair-deep font-semibold text-paper hover:bg-onair">
              <X className="h-5 w-5" aria-hidden />
              {vi.skipVote.no}
            </button>
            <button type="button" onClick={s.dismiss} className="min-h-11 rounded-row px-2 text-[13px] text-sage hover:text-paper">
              {vi.skipVote.later}
            </button>
          </div>
        ) : (
          mine && <p className="mt-2 text-[13px] text-sage">{mine === 'yes' ? vi.skipVote.youYes : vi.skipVote.youNo}</p>
        )}
      </section>
    </div>
  );
}

/**
 * Countdown bar: the share of time left, set from the same clock as "còn N giây" (ticks
 * every second) and eased over that second. With "reduce motion" the easing is dropped
 * by the global rule, so it steps once a second instead of vanishing.
 */
function Drain({ leftMs, totalMs, thick }: { leftMs: number; totalMs: number; thick: boolean }) {
  const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
  return (
    <div className={`mt-2.5 overflow-hidden rounded-full bg-dial-deep ${thick ? 'h-2.5' : 'h-1.5'}`} aria-hidden>
      <div className="h-full rounded-full bg-amber" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />
    </div>
  );
}

'use client';

import { Check, SkipForward, X } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Thumb } from '@/components/ui/Thumb';
import { useAct } from '@/hooks/useAct';
import { vi } from '@/i18n/vi';
import { useMe, useNowPlaying, useRoom } from '@/state/hooks';

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

type Result = { kind: 'skipped' | 'kept'; title: string };

/** "Đã qua bài" / "Cả phòng muốn nghe tiếp" for a moment after a vote closes. */
function useVoteResult(): Result | null {
  const np = useNowPlaying();
  const open = useRef<{ itemId: string; title: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const endsAt = np?.skip.endsAt ?? null;
  const itemId = np?.item.id ?? null;
  const title = np?.item.track.title ?? '';
  useEffect(() => {
    if (endsAt !== null && itemId) {
      open.current = { itemId, title };
      return;
    }
    const prev = open.current;
    if (!prev) return;
    open.current = null;
    setResult({ kind: itemId === prev.itemId ? 'kept' : 'skipped', title: prev.title });
    const t = setTimeout(() => setResult(null), 2500);
    return () => clearTimeout(t);
  }, [endsAt, itemId, title]);
  return result;
}

/**
 * V1: the skip vote everyone sees. `member`: floating card with ✅ / ❌ (compact once I
 * voted or chose "Để sau"); `host`: a large read-only banner on the speaker screen;
 * `pip`: inline in the mini player.
 */
export function SkipVote({ variant }: { variant: 'member' | 'host' | 'pip' }) {
  const np = useNowPlaying();
  const me = useMe();
  const offset = useRoom((s) => s.offset);
  const windowSec = useRoom((s) => s.snapshot?.room.settings.skipVoteWindowSec ?? 20);
  const act = useAct();
  const result = useVoteResult();
  const [dismissed, setDismissed] = useState<number | null>(null);

  const endsAt = np?.skip.endsAt ?? null;
  const open = Boolean(np && endsAt !== null);
  const now = useNow(1000, open);

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

  if (!open && result) {
    return (
      <div className={frame}>
        <div role="status" className={`${card} text-center font-semibold ${variant === 'host' ? 'text-[24px]' : 'text-[15px]'}`}>
          {result.kind === 'skipped' ? vi.skipVote.skipped : vi.skipVote.kept}
        </div>
      </div>
    );
  }
  if (!np || endsAt === null) return null;

  const serverNow = now + offset;
  const leftMs = Math.max(0, endsAt - serverNow);
  const seconds = Math.ceil(leftMs / 1000);
  const { votes, required, against, voters, againstVoters, openedBy } = np.skip;
  const mine = me ? (voters.includes(me.id) ? 'yes' : againstVoters.includes(me.id) ? 'no' : null) : null;
  const canVote = variant !== 'host' && Boolean(me && !me.isDevice);
  const full = canVote && mine === null && dismissed !== endsAt;
  const host = variant === 'host';

  const vote = (approve: boolean) =>
    act('queue:vote-skip', { queueItemId: np.item.id, approve }, { optimistic: { kind: 'vote', itemId: np.item.id, approve } });

  return (
    <div className={frame}>
      <section aria-label={vi.skipVote.label} aria-live="polite" className={card}>
        <div className="flex items-center gap-3">
          {variant !== 'pip' && <Thumb url={np.item.track.thumbnailUrl} size={host ? 64 : 44} className="rounded-row" />}
          <div className="min-w-0 flex-1">
            <p className={`leading-snug ${host ? 'text-[22px]' : 'text-[14px]'}`}>
              <SkipForward className={`mr-1.5 inline align-[-2px] text-amber ${host ? 'h-5 w-5' : 'h-4 w-4'}`} aria-hidden />
              {openedBy ? vi.skipVote.asks(openedBy.id === me?.id ? vi.skipVote.you : openedBy.displayName) : vi.skipVote.asksAnon}
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

        <Drain leftMs={leftMs} totalMs={windowSec * 1000} thick={host} />

        {full ? (
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <button type="button" onClick={() => void vote(true)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-row bg-online font-semibold text-dial-deep hover:brightness-110">
              <Check className="h-5 w-5" aria-hidden />
              {vi.skipVote.yes}
            </button>
            <button type="button" onClick={() => void vote(false)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-row bg-onair-deep font-semibold text-paper hover:bg-onair">
              <X className="h-5 w-5" aria-hidden />
              {vi.skipVote.no}
            </button>
            <button type="button" onClick={() => setDismissed(endsAt)} className="min-h-11 rounded-row px-2 text-[13px] text-sage hover:text-paper">
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

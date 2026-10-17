'use client';

import { Check, X } from 'lucide-react';
import { meterProps, type SkipVoteState, type VoteMeterProps } from '@/components/room/stage/useSkipVoteState';
import { useT } from '@/i18n';

/** The default countdown: a thin bar that drains. */
export function DrainBar({ leftMs, totalMs }: VoteMeterProps) {
  const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
  return (
    <span className="stage-vote-bar" aria-hidden>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * The skip vote inside a themed stage (≥1024 px; smaller screens keep the floating card).
 * `meter` draws the countdown (bar, moon, LED digits, boss health…), at `meterAt`.
 */
export function StageVote({
  s,
  meter: Meter = DrainBar,
  meterAt = 'bottom',
  text,
  className = '',
}: {
  s: SkipVoteState;
  meter?: React.ComponentType<VoteMeterProps>;
  meterAt?: 'start' | 'middle' | 'bottom';
  /** The theme's wording for the vote line (e.g. "Boss: …"). */
  text?: (s: Extract<SkipVoteState, { open: true }>) => string;
  className?: string;
}) {
  const t = useT();
  if (!s.open) {
    if (!s.result) return null;
    return (
      <p role="status" className={`stage-vote ${className}`}>
        <span className="stage-vote-text font-semibold">{s.result.kind === 'skipped' ? t.skipVote.skipped : t.skipVote.kept}</span>
      </p>
    );
  }
  const line = text ? text(s) : t.themeText.vote(s.asksLabel, s.votes, s.required, s.against, t.skipVote.seconds(s.seconds));
  const meter = <Meter {...meterProps(s)} />;
  return (
    <section aria-label={t.skipVote.label} aria-live="polite" className={`stage-vote ${className}`} data-meter={meterAt}>
      {meterAt === 'start' && meter}
      <span className="stage-vote-text">{line}</span>
      {meterAt === 'middle' && meter}
      {s.offer ? (
        <span className="stage-vote-actions">
          <button type="button" className="stage-btn stage-sb" data-primary onClick={() => s.vote(true)}>
            <Check className="h-4 w-4" aria-hidden />
            {t.skipVote.yes}
          </button>
          <button type="button" className="stage-btn stage-sb" onClick={() => s.vote(false)}>
            <X className="h-4 w-4" aria-hidden />
            {t.skipVote.no}
          </button>
        </span>
      ) : (
        s.mine && <span className="stage-vote-mine">{s.mine === 'yes' ? t.skipVote.youYes : t.skipVote.youNo}</span>
      )}
      {meterAt === 'bottom' && meter}
    </section>
  );
}

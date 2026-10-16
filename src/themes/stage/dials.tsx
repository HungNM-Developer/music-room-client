'use client';

import { useLiveProgress } from '@/components/room/stage/useLiveProgress';
import { vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';

/**
 * A plain progress line driven by `--p` (CSS draws the fill), with the elapsed time and
 * the length. `layout`: times beside the line, or under it. Themes restyle it by `variant`.
 */
export function LineDial({ variant, layout = 'below', className = '' }: { variant?: string; layout?: 'beside' | 'below'; className?: string }) {
  const { ref, timeRef, info } = useLiveProgress();
  const total = info ? (info.known ? formatDuration(info.durationSec) : vi.nowPlaying.unknownDuration) : '';
  return (
    <div ref={ref} className={`line-dial ${className}`} data-variant={variant} data-layout={layout} aria-hidden={!info}>
      <span ref={timeRef} className="line-dial-t">
        0:00
      </span>
      <span className="line-dial-track" aria-hidden>
        <i />
      </span>
      <span className="line-dial-total">{total}</span>
    </div>
  );
}

/** "0:52 trên 4:42" — the time as words, for themes whose artwork already shows progress. */
export function TimeText({ icon, className = '' }: { icon?: React.ReactNode; className?: string }) {
  const { ref, timeRef, info } = useLiveProgress();
  if (!info) return null;
  return (
    <p ref={ref as unknown as React.Ref<HTMLParagraphElement>} className={`stage-time ${className}`}>
      {icon}
      <span ref={timeRef}>0:00</span>
      {info.known ? ` trên ${formatDuration(info.durationSec)}` : ` · ${vi.nowPlaying.unknownDuration}`}
    </p>
  );
}

/** Sets --p on a wrapper so artwork (an arc, an orbit) can draw the progress. */
export function ProgressBox({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const { ref } = useLiveProgress();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

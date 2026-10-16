'use client';

import { vi } from '@/i18n/vi';
import { formatDuration } from '@/lib/time';
import { useNowPlaying } from '@/state/hooks';
import { useLiveProgress } from './stage/useLiveProgress';

type Size = 'compact' | 'large';

/** Minor / major tick spacing (s) so a dial never gets crowded, whatever the length. */
function scaleFor(durationSec: number): { minor: number; major: number } {
  if (durationSec <= 120) return { minor: 10, major: 30 };
  if (durationSec <= 420) return { minor: 15, major: 60 };
  if (durationSec <= 900) return { minor: 30, major: 60 };
  if (durationSec <= 2400) return { minor: 60, major: 300 };
  return { minor: 300, major: 900 };
}

const label = (sec: number, major: number) => (major < 60 ? formatDuration(sec) : String(Math.round(sec / 60)));

/**
 * The radio tuning scale: minute numbers printed above the ticks (as on a real dial), the
 * amber needle and the lit baseline behind it. Both read the CSS variable --p (0…1) on the
 * track, so moving them never re-renders React.
 */
export function DialScale({
  durationSec,
  size,
  trackRef,
  needle = true,
  className = '',
}: {
  /** Length of the scale in seconds (> 0). */
  durationSec: number;
  size: Size;
  trackRef?: React.Ref<HTMLDivElement>;
  needle?: boolean;
  className?: string;
}) {
  const large = size === 'large';
  const h = large ? 52 : 34;
  const ticks: { x: number; major: boolean }[] = [];
  const labels: { x: number; text: string }[] = [];
  const { minor, major } = scaleFor(durationSec);
  for (let t = 0; t <= durationSec + 0.001; t += minor) {
    const isMajor = t % major === 0;
    ticks.push({ x: t / durationSec, major: isMajor });
    if (isMajor && t > 0 && durationSec - t > minor * 1.5) labels.push({ x: t / durationSec, text: label(t, major) });
  }

  return (
    <div className={className}>
      <div ref={trackRef} className="dial-track relative" style={{ height: h }}>
        <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 1000 ${h}`} aria-hidden>
          <line x1="0" x2="1000" y1={h - 0.5} y2={h - 0.5} className="stroke-line" vectorEffect="non-scaling-stroke" strokeWidth="1" />
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x * 1000}
              x2={t.x * 1000}
              y1={h}
              y2={t.major ? h * 0.4 : h * 0.7}
              className={t.major ? 'stroke-sage/70' : 'stroke-line'}
              vectorEffect="non-scaling-stroke"
              strokeWidth={t.major && large ? 1.5 : 1}
            />
          ))}
        </svg>
        {labels.map((l) => (
          <span
            key={l.x}
            className={`type-display absolute top-0 -translate-x-1/2 leading-none text-sage/70 tabular-nums ${large ? 'text-[13px]' : 'text-[10px]'}`}
            style={{ left: `${l.x * 100}%` }}
            aria-hidden
          >
            {l.text}
          </span>
        ))}
        {needle && (
          <>
            <div className={`dial-fill absolute bottom-0 left-0 w-full bg-amber ${large ? 'h-[3px]' : 'h-[2px]'}`} aria-hidden />
            <div className={`dial-needle absolute bottom-0 left-0 rounded-full bg-amber ${large ? 'w-[3px]' : 'w-[2px]'}`} style={{ height: h * 0.72 }} aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}

/** Live dial for the track that is playing now. Updates 4×/s without React renders. */
export function LiveDial({ size = 'compact' }: { size?: Size }) {
  const np = useNowPlaying();
  const { ref: trackRef, timeRef, info: progress } = useLiveProgress();

  if (!np || !progress) return null;
  const large = size === 'large';
  return (
    <div className="dial">
      <DialScale durationSec={progress.durationSec} size={size} trackRef={trackRef} />
      <div className={`type-display mt-1.5 flex items-baseline justify-between leading-none tabular-nums ${large ? 'text-[16px]' : 'text-[13px] sm:text-[12px]'}`}>
        <span ref={timeRef} className="text-paper">
          0:00
        </span>
        <span className="text-sage">{progress.known ? formatDuration(progress.durationSec) : vi.nowPlaying.unknownDuration}</span>
      </div>
    </div>
  );
}

/** Decorative dial for the home page: the needle sweeps in once on load. */
export function HeroDial() {
  return (
    <div className="dial" aria-hidden>
      <div style={{ ['--p' as string]: 0.62 }}>
        <DialScale durationSec={300} size="large" className="dial-hero" />
      </div>
    </div>
  );
}

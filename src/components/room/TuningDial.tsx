'use client';

import { useEffect, useRef } from 'react';
import { vi } from '@/i18n/vi';
import { estimatePosition, formatDuration } from '@/lib/time';
import { useNowPlaying, useRoom } from '@/state/hooks';

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
 * The radio tuning scale: ticks, minute numbers and the amber needle. The needle's
 * position is the CSS variable --p (0…1) on the track, so moving it never re-renders React.
 */
function DialScale({
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
  const h = large ? 44 : 26;
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
              y2={t.major ? h * 0.25 : h * 0.62}
              className={t.major ? 'stroke-sage/70' : 'stroke-line'}
              vectorEffect="non-scaling-stroke"
              strokeWidth={t.major && large ? 1.5 : 1}
            />
          ))}
        </svg>
        {needle && (
          <div className={`dial-needle absolute bottom-0 left-0 rounded-full bg-amber ${large ? 'w-[3px]' : 'w-[2px]'}`} style={{ height: h + (large ? 10 : 6) }} aria-hidden />
        )}
      </div>
      {labels.length > 0 && (
        <div className={`type-display relative mt-1 text-sage tabular-nums ${large ? 'h-5 text-[14px]' : 'h-4 text-[11px]'}`} aria-hidden>
          {labels.map((l) => (
            <span key={l.x} className="absolute -translate-x-1/2" style={{ left: `${l.x * 100}%` }}>
              {l.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Scale used when YouTube gave no duration (no API key): the needle shows elapsed minutes. */
const UNKNOWN_SCALE_SEC = 600;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Live dial for the track that is playing now. Updates 4×/s without React renders. */
export function LiveDial({ size = 'compact' }: { size?: Size }) {
  const np = useNowPlaying();
  const offset = useRoom((s) => s.offset);
  const trackRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const itemId = np?.item.id;

  // A new track: sweep the needle in from the left once (the one automatic motion).
  // Declared before the tick effect so p=0 is committed before the real position lands.
  useEffect(() => {
    const track = trackRef.current;
    if (!itemId || !track || prefersReducedMotion()) return;
    track.dataset.mode = 'none';
    track.style.setProperty('--p', '0');
    void track.offsetWidth; // commit p=0 before turning the sweep transition on
    track.dataset.mode = 'sweep';
    const settle = setTimeout(() => (track.dataset.mode = 'run'), 950);
    return () => {
      clearTimeout(settle);
      track.dataset.mode = 'run';
    };
  }, [itemId]);

  useEffect(() => {
    const track = trackRef.current;
    if (!np || !track) return;
    const dur = np.item.track.durationSec;
    const scale = dur || UNKNOWN_SCALE_SEC;
    let lastSec = -1;
    const tick = () => {
      const pos = estimatePosition({ ...np, durationSec: dur }, offset, Date.now());
      track.style.setProperty('--p', String(Math.min(1, pos / scale)));
      const sec = Math.floor(pos);
      if (sec !== lastSec && timeRef.current) {
        lastSec = sec;
        timeRef.current.textContent = formatDuration(pos);
      }
    };
    tick();
    const timer = np.status === 'PLAYING' ? setInterval(tick, 250) : undefined;
    return () => clearInterval(timer);
  }, [np, offset]);

  if (!np) return null;
  const dur = np.item.track.durationSec;
  const large = size === 'large';
  return (
    <div className="dial">
      <DialScale durationSec={dur || UNKNOWN_SCALE_SEC} size={size} trackRef={trackRef} />
      <div className={`type-display mt-1.5 flex items-baseline justify-between tabular-nums ${large ? 'text-[18px]' : 'text-[13px]'}`}>
        <span ref={timeRef} className="text-paper">
          0:00
        </span>
        <span className="text-sage">{dur ? formatDuration(dur) : vi.nowPlaying.unknownDuration}</span>
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

'use client';

import { useEffect, useState } from 'react';
import { ytThumb } from '@/lib/thumbs';
import { useRoom } from '@/state/hooks';

/** One artwork layer; fades in once its pixels have arrived. */
function Layer({ src }: { src: string }) {
  // React attaches onLoad before it sets src, so cached images report too.
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote YouTube artwork
    <img
      src={src}
      alt=""
      decoding="async"
      onLoad={() => setLoaded(true)}
      // Heavy blur + saturation: only the artwork's colours survive, never the picture.
      // Scaled up so the soft edges of the blur stay off-screen. Static, painted once.
      className={`absolute inset-0 h-full w-full scale-150 object-cover blur-[72px] saturate-150 transition-opacity duration-1000 ease-out ${
        loaded ? 'opacity-80' : 'opacity-0'
      }`}
    />
  );
}

/**
 * Music-app colour wash: the artwork of the song on air, blurred until only its colours
 * remain, behind the top of the page and fading into the dial colour. Static (no
 * animation loop); a new song cross-fades in over the old one, dropped once faded.
 */
export function Backdrop({ height = 'h-[78vh]' }: { height?: string }) {
  // 320×180 is plenty once blurred (and has no letterbox bars to darken the wash).
  const src = ytThumb(useRoom((s) => s.snapshot?.nowPlaying?.item.track.thumbnailUrl));
  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState<string | null>(null);

  // Derived state: keep the outgoing artwork underneath while the new one fades in.
  if (src !== current) {
    setPrevious(current);
    setCurrent(src);
  }
  useEffect(() => {
    if (!previous) return;
    const t = setTimeout(() => setPrevious(null), 1400);
    return () => clearTimeout(t);
  }, [previous]);

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 -z-10 overflow-hidden ${height}`}>
      {previous && <Layer key={previous} src={previous} />}
      {current && <Layer key={current} src={current} />}
      {/* Fades into the page colour so panels and text stay readable. */}
      <div className="absolute inset-0 bg-linear-to-b from-dial/10 via-dial/50 to-dial" />
    </div>
  );
}

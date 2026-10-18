'use client';

import { Headphones, Plus } from 'lucide-react';
import { setListening, useListening } from '@/components/player/ListenAlong';
import { useT } from '@/i18n';
import { ytThumbLarge } from '@/lib/thumbs';
import { useMe, useNowPlaying } from '@/state/hooks';

/**
 * The song's artwork filling its box (square or round by CSS). YouTube's large thumbnail
 * is letterboxed 4:3; scaling it 4/3 crops the black bars away.
 */
export function CoverImage({ url, className = '' }: { url: string | null | undefined; className?: string }) {
  const src = ytThumbLarge(url);
  return (
    <span aria-hidden className={`stage-cover-img block overflow-hidden bg-line ${className}`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- remote YouTube artwork
        <img src={src} alt="" decoding="async" className="h-full w-full scale-[1.34] object-cover" />
      )}
    </span>
  );
}

/** The cover of the song on air (null when idle). */
export function NowCover({ className = '' }: { className?: string }) {
  const url = useNowPlaying()?.item.track.thumbnailUrl;
  return <CoverImage url={url} className={className} />;
}

/** The picker's wish, as a quote under the title. */
export function WishBlock({ className = '' }: { className?: string }) {
  const t = useT();
  const np = useNowPlaying();
  const picker = np?.item.addedBy?.displayName;
  if (!np?.item.wishMessage || !picker) return null;
  return (
    <figure className={`stage-wish ${className}`}>
      <figcaption>{t.nowPlaying.wishFrom(picker)}</figcaption>
      <blockquote>{np.item.wishMessage}</blockquote>
    </figure>
  );
}

/** Nothing on air: say so and offer the add tab. */
export function StageIdle({ openAdd }: { openAdd: () => void }) {
  const t = useT();
  const me = useMe();
  return (
    <section aria-label={t.nowPlaying.title} data-guide="nowPlaying" className="stage-idle">
      <p className="stage-state">
        <span className="stage-dot" data-live="false" aria-hidden />
        {t.nowPlaying.paused}
      </p>
      <h2 className="stage-title">{t.nowPlaying.idleTitle}</h2>
      <p className="stage-by">{t.nowPlaying.idle}</p>
      {me && !me.isDevice && (
        <div className="stage-controls">
          <button type="button" className="stage-btn" data-primary onClick={openAdd}>
            <Plus className="h-[18px] w-[18px]" aria-hidden />
            {t.queue.addFirst}
          </button>
        </div>
      )}
    </section>
  );
}

/** "Nghe cùng" as a stage button (the same switch as the default card's). */
export function ListenToggle({ short = false }: { short?: boolean }) {
  const t = useT();
  const on = useListening();
  return (
    <button type="button" className="stage-btn" data-guide="listen" data-on={on || undefined} aria-pressed={on} onClick={() => setListening(!on)}>
      <Headphones className="h-[18px] w-[18px]" aria-hidden />
      <span className={short ? 'max-lg:sr-only' : ''}>{on ? t.listen.on : t.listen.start}</span>
    </button>
  );
}

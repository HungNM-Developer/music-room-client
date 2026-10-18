'use client';

import { Volume2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/i18n';

/**
 * The browser refused sound and the video plays muted: a light layer over the whole page asks for
 * the one tap that turns the speaker on (PlayerEngine listens for it anywhere). The video stays
 * visible under it; the layer goes on that tap. "Xem cách…" also opens the tips for next time —
 * on pointer down / key down, since the layer is gone before a click would arrive.
 */
export function SoundOverlay({ touch, onTips }: { touch: boolean; onTips: () => void }) {
  const t = useT();
  const ref = useRef<HTMLButtonElement>(null);
  // Keyboard users: Enter / Space on the focused layer is the tap.
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  const title = touch ? t.host.soundTapTouch : t.host.soundTap;
  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-6">
      <button ref={ref} type="button" aria-label={title} className="absolute inset-0 cursor-pointer" />
      <div className="pointer-events-none relative flex max-w-sm items-start gap-4 rounded-panel border border-amber/70 bg-panel px-5 py-4 text-paper shadow-[0_16px_48px_-12px_rgb(0_0_0/0.8)]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber text-amber-ink" aria-hidden>
          <Volume2 className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="block text-[17px] font-semibold">{title}</span>
          <span className="mt-1 block text-[14px] leading-snug text-sage">{t.host.soundWhy}</span>
          <button
            type="button"
            onPointerDown={onTips}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onTips();
            }}
            className="pointer-events-auto mt-2 inline-flex min-h-9 items-center text-[14px] font-semibold text-amber underline-offset-4 hover:underline"
          >
            {t.host.soundHowTo}
          </button>
        </span>
      </div>
    </div>,
    document.body,
  );
}

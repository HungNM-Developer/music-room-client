'use client';

import { Pointer } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { findSongs } from '@/lib/find-songs';
import { type GuideRequest, onGuide } from '@/lib/guide';
import { room } from '@/state/room-store';

/** What the tooltip says: "skip" depends on the viewer's own rights. */
type GuideKey = Exclude<GuideRequest['target'], 'skip'> | 'skipVote' | 'skipNow';

interface Shown {
  key: GuideKey;
  el: HTMLElement | null;
  /** add: the box was filled with a song name. */
  query?: string;
  /** "Chỉ cho tôi", to give focus back to when the guide is dismissed. */
  opener: HTMLElement | null;
}

/** restore: dismissed (Esc, "Đã hiểu", a click elsewhere), so focus goes back to the opener. */
type Close = (restore: boolean) => void;

const PAD = 6;
const GAP = 12;

function visible(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** The first matching element that is on the page (themes hide some copies per screen size). */
function find(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = Array.from(document.querySelectorAll(sel)).find(visible);
    if (el) return el;
  }
  return null;
}

function resolve(g: GuideRequest): { key: GuideKey; selectors: string[] } {
  if (g.target === 'skip') {
    const s = room.getState();
    const me = s.snapshot?.members.find((m) => m.id === s.memberId);
    const control = Boolean(me && (me.role === 'ADMIN' || me.canControl));
    return control ? { key: 'skipNow', selectors: ['[data-guide="skipNow"]', '[data-guide="skip"]'] } : { key: 'skipVote', selectors: ['[data-guide="skip"]'] };
  }
  if (g.target === 'myItem') {
    return { key: 'myItem', selectors: g.queueItemId ? [`[data-guide-item="${CSS.escape(g.queueItemId)}"]`] : [] };
  }
  if (g.target === 'heart') return { key: 'heart', selectors: ['[data-guide="heart"]'] };
  return { key: g.target, selectors: [`[data-guide="${g.target}"]`] };
}

/**
 * "Chỉ cho tôi" (spec 2026-10-18-dj-chat): the page dims, the button the member asked about
 * stays lit with a short note. Closes on Esc, a click elsewhere, or using the button itself.
 */
export function GuideSpotlight({ showTab }: { showTab: (tab: 'room' | 'add') => void }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const shownRef = useRef<Shown | null>(null);
  // Stable: the room page re-renders often (queue, members) while the guide is open.
  const close = useCallback<Close>((restore) => {
    const opener = shownRef.current?.opener;
    shownRef.current = null;
    setShown(null);
    if (restore && opener?.isConnected) opener.focus({ preventScroll: true });
  }, []);
  const showTabRef = useRef(showTab);
  useLayoutEffect(() => {
    showTabRef.current = showTab;
  });

  useEffect(
    () =>
      onGuide((g) => {
        const { key, selectors } = resolve(g);
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (g.target === 'add') {
          // The add panel opens on the search box, with the song name in it.
          findSongs(g.query);
        } else if (!window.matchMedia('(min-width: 1024px)').matches && g.target !== 'share') {
          showTabRef.current('room');
        }
        // Wait for the tab switch / the chat sheet closing to reach the page.
        window.setTimeout(() => {
          let el = find(selectors);
          if (el && key === 'myItem') el = (el.closest('li') as HTMLElement | null) ?? el;
          el?.scrollIntoView({ block: 'center', behavior: 'instant' });
          const next = { key, el, query: g.target === 'add' ? g.query : undefined, opener };
          shownRef.current = next;
          setShown(next);
        }, 120);
      }),
    [],
  );

  if (!shown) return null;
  return createPortal(<Spotlight key={`${shown.key}`} shown={shown} onClose={close} />, document.body);
}

function Spotlight({ shown, onClose }: { shown: Shown; onClose: Close }) {
  const t = useT();
  const titleId = useId();
  const bodyId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(() => shown.el?.getBoundingClientRect() ?? null);
  const [tipH, setTipH] = useState(160);
  const { el, key } = shown;

  // Follow the button while the page scrolls or resizes; a button that went away ends the guide.
  useEffect(() => {
    if (!el) return;
    const measure = () => {
      if (!el.isConnected || !el.getClientRects().length) return onClose(false);
      setRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
    };
  }, [el, onClose]);

  useLayoutEffect(() => {
    if (tipRef.current) setTipH(tipRef.current.offsetHeight);
  }, [key]);

  // Focus: the lit button itself (Enter uses it; the note is its description), otherwise "Đã hiểu".
  useEffect(() => {
    const prev = el?.getAttribute('aria-describedby') ?? null;
    if (el) {
      el.setAttribute('aria-describedby', [prev, bodyId].filter(Boolean).join(' '));
      el.focus({ preventScroll: true });
    } else okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose(true);
    };
    // Using the button (click, Enter, or typing in the search box) ends the guide.
    const onUse = (e: Event) => {
      if (!(e.target instanceof Node)) return;
      // No button lit (only the note shows): a click elsewhere dismisses the note.
      if (!el) {
        if (e.type === 'click' && !tipRef.current?.contains(e.target)) onClose(true);
        return;
      }
      if (e instanceof KeyboardEvent && e.key !== 'Enter') return;
      if (el.contains(e.target)) onClose(false);
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('click', onUse, true);
    el?.addEventListener('input', onUse);
    el?.addEventListener('keydown', onUse);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('click', onUse, true);
      el?.removeEventListener('input', onUse);
      el?.removeEventListener('keydown', onUse);
      if (prev === null) el?.removeAttribute('aria-describedby');
      else el?.setAttribute('aria-describedby', prev);
    };
  }, [el, bodyId, onClose]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = rect && {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    right: Math.min(vw, rect.right + PAD),
    bottom: Math.min(vh, rect.bottom + PAD),
  };
  const tipW = Math.min(320, vw - 32);
  // Below the button when it fits, otherwise above; centred when there is no button.
  const tipStyle: React.CSSProperties = hole
    ? {
        width: tipW,
        left: Math.min(Math.max(16, (hole.left + hole.right) / 2 - tipW / 2), vw - tipW - 16),
        top: hole.bottom + GAP + tipH <= vh - 16 ? hole.bottom + GAP : Math.max(16, hole.top - GAP - tipH),
      }
    : { width: tipW, left: (vw - tipW) / 2, top: Math.max(16, (vh - tipH) / 2) };

  const dim = 'pointer-events-auto fixed bg-black/[0.62]';
  return (
    <div className="guide-spotlight pointer-events-none fixed inset-0 z-[70]" data-guide-open>
      {hole ? (
        <>
          {/* Four panels around the hole: the lit button stays clickable. */}
          <div className={dim} style={{ top: 0, left: 0, right: 0, height: hole.top }} onClick={() => onClose(true)} />
          <div className={dim} style={{ top: hole.bottom, left: 0, right: 0, bottom: 0 }} onClick={() => onClose(true)} />
          <div className={dim} style={{ top: hole.top, left: 0, width: hole.left, height: hole.bottom - hole.top }} onClick={() => onClose(true)} />
          <div className={dim} style={{ top: hole.top, left: hole.right, right: 0, height: hole.bottom - hole.top }} onClick={() => onClose(true)} />
          <div
            aria-hidden
            className="pointer-events-none fixed rounded-[14px] outline outline-[3px] outline-amber motion-safe:animate-pulse"
            style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }}
          />
        </>
      ) : null}
      <div
        ref={tipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="pointer-events-auto fixed rounded-panel border border-amber/70 bg-panel p-4 text-paper shadow-[0_16px_48px_-12px_rgb(0_0_0/0.8)]"
        style={tipStyle}
      >
        <p id={titleId} className="flex items-center gap-2 font-semibold">
          <Pointer className="h-[18px] w-[18px] shrink-0 text-amber" aria-hidden />
          {t.djBot.guideTitle[key]}
        </p>
        <p id={bodyId} className="mt-1.5 text-[14px] leading-snug text-sage">
          {!el ? t.djBot.guideMissing : shown.query ? t.djBot.addQueryBody : t.djBot.guideBody[key]}
        </p>
        <div className="mt-3 flex justify-end">
          <Button ref={okRef} size="sm" variant="primary" onClick={() => onClose(true)}>
            {t.djBot.gotIt}
          </Button>
        </div>
      </div>
    </div>
  );
}

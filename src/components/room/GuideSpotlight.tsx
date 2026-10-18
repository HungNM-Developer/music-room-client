'use client';

import { Pointer } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { type Dict, useT } from '@/i18n';
import { findSongs } from '@/lib/find-songs';
import { type GuideRequest, type GuideStep, type GuideTab, onGuide } from '@/lib/guide';
import { room } from '@/state/room-store';

interface Run {
  steps: GuideStep[];
  tour: boolean;
  /** Focus goes back here when the guide is dismissed. */
  opener: HTMLElement | null;
}

interface Shown {
  run: Run;
  index: number;
  el: HTMLElement | null;
  /** Which showing this is: a new step remounts the note. */
  id: number;
}

/** restore: dismissed (Esc, "Đã hiểu", a click elsewhere), so focus goes back to the opener. */
type Close = (restore: boolean) => void;

const PAD = 6;
const GAP = 12;
/** Time for a tab switch / the phone chat sheet closing to reach the page. */
const SETTLE_MS = 120;

function visible(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** The first matching element that is on the page (themes hide some copies per screen size). */
function find(step: GuideStep): HTMLElement | null {
  for (const sel of step.selectors) {
    const el = Array.from(document.querySelectorAll(sel)).find(visible);
    if (el) return step.row ? ((el.closest('li') as HTMLElement | null) ?? el) : el;
  }
  return null;
}

/** The DJ's "Chỉ cho tôi" as a one-step guide; "skip" depends on the viewer's own rights. */
function djStep(t: Dict, g: GuideRequest): GuideStep {
  const text = (key: keyof Dict['djBot']['guideTitle']) => ({
    title: t.djBot.guideTitle[key],
    body: key === 'add' && g.query ? t.djBot.addQueryBody : t.djBot.guideBody[key],
  });
  if (g.target === 'skip') {
    const s = room.getState();
    const me = s.snapshot?.members.find((m) => m.id === s.memberId);
    const control = Boolean(me && (me.role === 'ADMIN' || me.canControl));
    return control
      ? { ...text('skipNow'), selectors: ['[data-guide="skipNow"]', '[data-guide="skip"]'], tab: 'room' }
      : { ...text('skipVote'), selectors: ['[data-guide="skip"]'], tab: 'room' };
  }
  if (g.target === 'myItem')
    return { ...text('myItem'), selectors: g.queueItemId ? [`[data-guide-item="${CSS.escape(g.queueItemId)}"]`] : [], tab: 'room', row: true };
  if (g.target === 'add') return { ...text('add'), selectors: ['[data-guide="add"]'], tab: 'add', findQuery: g.query ?? '' };
  // The header (share) is on every tab.
  return { ...text(g.target), selectors: [`[data-guide="${g.target}"]`], tab: g.target === 'share' ? undefined : 'room' };
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/** The lit part itself when it takes focus, else the first control inside it. */
function focusTarget(el: HTMLElement): HTMLElement | null {
  return el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>(FOCUSABLE);
}

const settle = () => new Promise<void>((r) => window.setTimeout(r, SETTLE_MS));

/**
 * Lights part of the room page with a short note: the DJ's "Chỉ cho tôi" and the help items
 * (spec 2026-10-18-dj-chat), and the first-visit tour (Back / Next / Skip). Closes on Esc, a click
 * elsewhere, or using the lit button; the tour only through its own buttons or Esc.
 */
export function GuideSpotlight({ showTab }: { showTab: (tab: GuideTab) => void }) {
  const t = useT();
  const [shown, setShown] = useState<Shown | null>(null);
  const shownRef = useRef<Shown | null>(null);
  const tRef = useRef(t);
  const showTabRef = useRef(showTab);
  useLayoutEffect(() => {
    tRef.current = t;
    showTabRef.current = showTab;
  });
  // Bumped on every new guide / step, so a slow step that was overtaken does nothing.
  const seq = useRef(0);

  const show = useCallback((next: Shown | null) => {
    shownRef.current = next;
    setShown(next);
  }, []);

  // Stable: the room page re-renders often (queue, members) while the guide is open.
  const close = useCallback<Close>(
    (restore) => {
      seq.current++;
      const opener = shownRef.current?.run.opener;
      show(null);
      if (restore && opener?.isConnected) opener.focus({ preventScroll: true });
    },
    [show],
  );

  /** Shows step `index`, or the next one in `dir` that is on screen (tour). */
  const go = useCallback(
    async (run: Run, index: number, dir: 1 | -1) => {
      const my = ++seq.current;
      // The note on screen goes first: a tab switch hides its part, and its "part went away"
      // check would otherwise end the whole tour.
      show(null);
      for (let i = index; i >= 0 && i < run.steps.length; i += dir) {
        const step = run.steps[i];
        if (step.findQuery !== undefined) {
          // The add panel opens on the search box, with the song name in it.
          findSongs(step.findQuery || undefined);
          await settle();
        }
        let el = find(step);
        if (!el && step.tab) {
          showTabRef.current(step.tab);
          await settle();
          el = find(step);
        }
        if (my !== seq.current) return;
        if (!el && run.tour) continue;
        el?.scrollIntoView({ block: 'center', behavior: 'instant' });
        show({ run, index: i, el, id: my });
        return;
      }
      // Ran off either end of the tour: it is over.
      if (my === seq.current) close(false);
    },
    [show, close],
  );

  useEffect(
    () =>
      onGuide((e) => {
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const run: Run =
          e.kind === 'dj'
            ? { steps: [djStep(tRef.current, e.request)], tour: false, opener }
            : { steps: e.run.steps, tour: Boolean(e.run.tour), opener };
        // Let the phone chat sheet / a dialog close first.
        window.setTimeout(() => void go(run, 0, 1), SETTLE_MS);
      }),
    [go],
  );

  if (!shown) return null;
  const nav = shown.run.tour
    ? {
        index: shown.index,
        total: shown.run.steps.length,
        back: () => void go(shown.run, shown.index - 1, -1),
        next: () => void go(shown.run, shown.index + 1, 1),
      }
    : null;
  return createPortal(
    <Spotlight key={shown.id} step={shown.run.steps[shown.index]} el={shown.el} nav={nav} onClose={close} />,
    document.body,
  );
}

interface Nav {
  index: number;
  total: number;
  back: () => void;
  next: () => void;
}

function Spotlight({ step, el, nav, onClose }: { step: GuideStep; el: HTMLElement | null; nav: Nav | null; onClose: Close }) {
  const t = useT();
  const titleId = useId();
  const bodyId = useId();
  const okRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(() => el?.getBoundingClientRect() ?? null);
  const [tipH, setTipH] = useState(160);
  const tour = nav !== null;

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
  }, [step]);

  // Focus: the lit control (Enter uses it; the note is its description); the tour, and a part
  // with nothing to press, focus the note's own button.
  useEffect(() => {
    const target = el && !tour ? focusTarget(el) : null;
    const prev = target?.getAttribute('aria-describedby') ?? null;
    if (target) {
      target.setAttribute('aria-describedby', [prev, bodyId].filter(Boolean).join(' '));
      target.focus({ preventScroll: true });
    } else okRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose(true);
    };
    // Using the button (click, Enter, or typing in the search box) ends a single guide.
    const onUse = (e: Event) => {
      if (tour || !(e.target instanceof Node)) return;
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
      if (target) {
        if (prev === null) target.removeAttribute('aria-describedby');
        else target.setAttribute('aria-describedby', prev);
      }
    };
  }, [el, bodyId, onClose, tour]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const hole = rect && {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    right: Math.min(vw, rect.right + PAD),
    bottom: Math.min(vh, rect.bottom + PAD),
  };
  const tipW = Math.min(340, vw - 32);
  // Below the part when it fits, otherwise above, otherwise the side with more room; centred
  // when nothing is lit.
  const below = hole ? vh - hole.bottom : 0;
  const above = hole ? hole.top : 0;
  const tipStyle: React.CSSProperties = hole
    ? {
        width: tipW,
        left: Math.min(Math.max(16, (hole.left + hole.right) / 2 - tipW / 2), vw - tipW - 16),
        top:
          below >= GAP + tipH + 16 || below >= above
            ? Math.min(hole.bottom + GAP, vh - tipH - 16)
            : Math.max(16, hole.top - GAP - tipH),
      }
    : { width: tipW, left: (vw - tipW) / 2, top: Math.max(16, (vh - tipH) / 2) };

  // A single guide: clicking the dim closes it. The tour: only its own buttons (and Esc).
  const dimClick = tour ? undefined : () => onClose(true);
  const dim = 'pointer-events-auto fixed bg-black/[0.62]';
  return (
    <div className="guide-spotlight pointer-events-none fixed inset-0 z-[70]" data-guide-open>
      {hole ? (
        <>
          {/* Four panels around the hole: the lit button stays clickable (not during the tour). */}
          <div className={dim} style={{ top: 0, left: 0, right: 0, height: hole.top }} onClick={dimClick} />
          <div className={dim} style={{ top: hole.bottom, left: 0, right: 0, bottom: 0 }} onClick={dimClick} />
          <div className={dim} style={{ top: hole.top, left: 0, width: hole.left, height: hole.bottom - hole.top }} onClick={dimClick} />
          <div className={dim} style={{ top: hole.top, left: hole.right, right: 0, height: hole.bottom - hole.top }} onClick={dimClick} />
          <div
            aria-hidden
            className={`fixed rounded-[14px] outline outline-[3px] outline-amber motion-safe:animate-pulse ${tour ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }}
          />
        </>
      ) : (
        tour && <div className={`${dim} inset-0`} />
      )}
      <div
        ref={tipRef}
        role="dialog"
        aria-modal={tour}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="pointer-events-auto fixed rounded-panel border border-amber/70 bg-panel p-4 text-paper shadow-[0_16px_48px_-12px_rgb(0_0_0/0.8)]"
        style={tipStyle}
      >
        <p id={titleId} className="flex items-center gap-2 font-semibold">
          <Pointer className="h-[18px] w-[18px] shrink-0 text-amber" aria-hidden />
          <span className="min-w-0 flex-1">{step.title}</span>
          {nav && <span className="shrink-0 text-[13px] font-normal text-sage tabular-nums">{t.help.step(nav.index + 1, nav.total)}</span>}
        </p>
        <p id={bodyId} className="mt-1.5 text-[14px] leading-snug text-sage">
          {step.body}
          {!el && !tour && <span className="mt-1.5 block">{t.djBot.guideMissing}</span>}
        </p>
        {nav ? (
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => onClose(true)} className="mr-auto">
              {t.help.skip}
            </Button>
            {nav.index > 0 && (
              <Button size="sm" variant="secondary" onClick={nav.back}>
                {t.help.back}
              </Button>
            )}
            <Button ref={okRef} size="sm" variant="primary" onClick={nav.index + 1 < nav.total ? nav.next : () => onClose(true)}>
              {nav.index + 1 < nav.total ? t.help.next : t.help.done}
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex justify-end">
            <Button ref={okRef} size="sm" variant="primary" onClick={() => onClose(true)}>
              {t.djBot.gotIt}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

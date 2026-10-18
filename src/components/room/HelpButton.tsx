'use client';

import { ChevronDown, CircleHelp, ExternalLink, Pointer, Signpost } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { SoundSettingGuide } from '@/components/player/SoundSettingGuide';
import { Button, IconButton } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { MemberView } from '@/contracts';
import { type Dict, tr, useT } from '@/i18n';
import { type GuideStep, type GuideTab, runGuide } from '@/lib/guide';
import { useMe, useRoom } from '@/state/hooks';

type ItemId = keyof Dict['help']['items'];
type GroupId = keyof Dict['help']['groups'];

interface Item {
  id: ItemId;
  /** Where it is on the page (first visible match); none = explained in the sheet only. */
  selectors?: string[];
  /** The tab it lives on, when it is not on screen (phones, or the side column). */
  tab?: GuideTab;
  /** Only shown to members with this right. */
  need?: 'control' | 'admin' | 'dj';
  /** A link under the explanation. */
  link?: 'host';
  /** The explanation is the step-by-step sound setting (SoundSettingGuide). */
  guide?: true;
}

const at = (name: string) => `[data-guide="${name}"]`;

/** Everything on the room page, by area (spec: the list the user approved, 2026-10-18). */
const GROUPS: { id: GroupId; items: Item[] }[] = [
  {
    id: 'nowPlaying',
    items: [
      { id: 'whereMusic', selectors: [at('nowPlaying')], tab: 'room' },
      { id: 'listen', selectors: [at('listen')], tab: 'room' },
      { id: 'skip', selectors: [at('skip')], tab: 'room' },
      { id: 'control', selectors: [at('pause'), at('skipNow')], tab: 'room', need: 'control' },
      { id: 'lyrics', selectors: [at('lyrics')], tab: 'room' },
      { id: 'save', selectors: [at('save')], tab: 'room' },
      { id: 'mini', selectors: [at('mini')], tab: 'room' },
      { id: 'block', selectors: [at('block')], tab: 'room', need: 'admin' },
    ],
  },
  {
    id: 'queue',
    items: [
      { id: 'queue', selectors: ['[aria-labelledby="queue-title"]', at('heart')], tab: 'room' },
      { id: 'heart', selectors: [at('heart')], tab: 'room' },
      { id: 'wish', selectors: [at('wish')], tab: 'room' },
      { id: 'itemMenu', selectors: [at('itemMenu')], tab: 'room' },
      { id: 'suggestions', selectors: ['[aria-labelledby="suggest-title"]'], tab: 'room' },
    ],
  },
  {
    id: 'add',
    items: [
      { id: 'add', selectors: [at('add')], tab: 'add' },
      { id: 'playlist', selectors: [at('add')], tab: 'add' },
      { id: 'played', selectors: ['#add-tab-played'], tab: 'add' },
      { id: 'mine', selectors: ['#add-tab-saved'], tab: 'add' },
      { id: 'blocked', selectors: ['#add-tab-blocked'], tab: 'add', need: 'admin' },
    ],
  },
  {
    id: 'chat',
    items: [
      // Phones: the chat bubble (the window itself is closed while a guide shows).
      { id: 'chat', selectors: [at('chat')] },
      { id: 'reactions', selectors: [at('reactions'), at('chat')] },
      { id: 'djPads', selectors: [at('djPads'), at('chat')], need: 'dj' },
      { id: 'djMention', selectors: [at('djMention'), at('chat')] },
    ],
  },
  {
    id: 'people',
    items: [
      { id: 'members', selectors: [at('people')], tab: 'people' },
      { id: 'permissions', selectors: [at('people')], tab: 'people', need: 'admin' },
      { id: 'recap', selectors: [at('recap')], tab: 'people' },
      { id: 'settings', selectors: [at('settings')], tab: 'people', need: 'admin' },
    ],
  },
  {
    id: 'top',
    items: [
      { id: 'share', selectors: [at('share')] },
      { id: 'history', selectors: [at('history')] },
      { id: 'theme', selectors: [at('theme')] },
      // Phones keep the language switch in the People tab.
      { id: 'lang', selectors: [at('lang')], tab: 'people' },
      { id: 'leave', selectors: [at('leave')] },
      { id: 'help', selectors: [at('help')] },
    ],
  },
  {
    id: 'outside',
    items: [{ id: 'host', link: 'host' }, { id: 'autoplay', guide: true }, { id: 'slack' }],
  },
];

/** The first-visit tour: the basics, in order. */
const TOUR: ItemId[] = ['whereMusic', 'listen', 'skip', 'add', 'wish', 'queue', 'chat', 'djMention', 'help'];

const ITEMS = new Map(GROUPS.flatMap((g) => g.items.map((i) => [i.id, i] as const)));

const TOUR_KEY = 'mr:help-tour';

function allowed(item: Item, me: MemberView | null): boolean {
  const admin = me?.role === 'ADMIN';
  if (item.need === 'admin') return admin;
  if (item.need === 'control') return admin || Boolean(me?.canControl);
  if (item.need === 'dj') return admin || Boolean(me?.canDj);
  return true;
}

function stepOf(t: Dict, item: Item): GuideStep {
  return { ...t.help.items[item.id], selectors: item.selectors ?? [], tab: item.tab };
}

function tourSteps(t: Dict): GuideStep[] {
  return TOUR.flatMap((id) => {
    const item = ITEMS.get(id);
    return item ? [stepOf(t, item)] : [];
  });
}

function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) !== null;
  } catch {
    // Storage blocked: never start the tour on its own.
    return true;
  }
}

function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    // private mode: nothing to remember
  }
}

/**
 * "Hướng dẫn" in the room header: every part of the room page, each lit on the page when picked.
 * The first visit on this device starts a short tour on its own.
 */
export function HelpButton() {
  const t = useT();
  const me = useMe();
  const code = useRoom((s) => s.snapshot?.room.code ?? '');
  const [open, setOpen] = useState(false);
  const member = Boolean(me && !me.isDevice);

  // First visit: once the room has drawn, unless something else (the join form…) is open.
  useEffect(() => {
    if (!member) return;
    const timer = window.setTimeout(() => {
      if (tourSeen() || document.querySelector('dialog[open]')) return;
      markTourSeen();
      runGuide({ steps: tourSteps(tr()), tour: true });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [member]);

  if (!member) return null;

  /** After the sheet has closed, so focus returns to this button when the guide ends. */
  const guide = (run: Parameters<typeof runGuide>[0]) => {
    setOpen(false);
    window.setTimeout(() => runGuide(run), 0);
  };

  return (
    <>
      <IconButton label={t.help.button} data-guide="help" onClick={() => setOpen(true)}>
        <CircleHelp className="h-5 w-5" aria-hidden />
      </IconButton>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={t.help.title} description={t.help.intro}>
          <Button variant="secondary" className="mb-5 w-full" onClick={() => guide({ steps: tourSteps(t), tour: true })}>
            <Signpost className="h-4 w-4" aria-hidden />
            {t.help.tour}
          </Button>
          <div className="space-y-5">
            {GROUPS.map((g) => {
              const items = g.items.filter((i) => allowed(i, me));
              if (!items.length) return null;
              return (
                <section key={g.id} aria-labelledby={`help-${g.id}`}>
                  <h3 id={`help-${g.id}`} className="mb-1.5 px-1 text-[15px] font-semibold">
                    {t.help.groups[g.id]}
                  </h3>
                  <ul className="divide-y divide-line/70 rounded-panel bg-panel-hi/60">
                    {items.map((item) => (
                      <li key={item.id}>
                        {item.selectors ? (
                          <button
                            type="button"
                            onClick={() => guide({ steps: [stepOf(t, item)] })}
                            className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-panel-hi"
                          >
                            <ItemText item={item} />
                            <Pointer className="h-[18px] w-[18px] shrink-0 text-amber" aria-hidden />
                          </button>
                        ) : (
                          <ExplainedItem item={item} code={code} />
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </Dialog>
      )}
    </>
  );
}

function ItemText({ item }: { item: Item }) {
  const t = useT();
  const text = t.help.items[item.id];
  return (
    <span className="min-w-0 flex-1">
      <span className="block font-medium">{text.title}</span>
      <span className="mt-0.5 block text-[13px] leading-snug text-sage">{text.body}</span>
    </span>
  );
}

/** Nothing to light on this page: the explanation, and a link when there is one. */
function ExplainedItem({ item, code }: { item: Item; code: string }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const id = useId();
  if (!item.link && !item.guide) {
    return (
      <div className="flex min-h-14 items-center gap-3 px-3 py-2.5">
        <ItemText item={item} />
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-expanded={shown}
        aria-controls={id}
        onClick={() => setShown((v) => !v)}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-panel-hi"
      >
        <span className="min-w-0 flex-1 font-medium">{t.help.items[item.id].title}</span>
        <ChevronDown className={`h-[18px] w-[18px] shrink-0 text-sage transition-transform ${shown ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {shown && (
        <div id={id} className="space-y-3 px-3 pb-3">
          {item.guide ? <SoundSettingGuide /> : <p className="text-[13px] leading-snug text-sage">{t.help.items[item.id].body}</p>}
          {item.link === 'host' && code && (
            <a
              href={`/r/${code}/host`}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber px-4 text-[14px] font-semibold text-amber-ink transition-colors hover:bg-amber-hi"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t.help.openHost}
            </a>
          )}
        </div>
      )}
    </>
  );
}

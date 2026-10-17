'use client';

import { PictureInPicture2, SkipForward } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '@/components/ui/Button';
import { Thumb } from '@/components/ui/Thumb';
import { useAct } from '@/hooks/useAct';
import { useT, tr } from '@/i18n';
import { addedByLabel } from '@/lib/added-by';
import { estimatePosition, formatDuration } from '@/lib/time';
import { useMe, useNowPlaying, useRoom } from '@/state/hooks';
import { ListenButton, ListenVolume, useListening } from '@/components/player/ListenAlong';
import { SkipVote, TimerWindowContext, useNow } from './SkipVote';

// M1: an always-on-top mini player (Document Picture-in-Picture, Chrome / Edge desktop).
// The window shows React content rendered from this page through a portal, so it shares
// the room store, the socket and every component; it closes with the room tab.

interface DocumentPip {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

let pipWindow: Window | null = null;
const listeners = new Set<() => void>();
const setPipWindow = (w: Window | null) => {
  pipWindow = w;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const noSubscribe = () => () => {};

const pipApi = (): DocumentPip | null =>
  (window as Window & { documentPictureInPicture?: DocumentPip }).documentPictureInPicture ?? null;

/** True in browsers that can open the mini player (false during server rendering). */
export const useMiniPlayerSupported = () => useSyncExternalStore(noSubscribe, () => pipApi() !== null, () => false);

const useMiniPlayerWindow = () => useSyncExternalStore(subscribe, () => pipWindow, () => null);

async function openMiniPlayer(): Promise<void> {
  const t = tr();
  const api = pipApi();
  if (!api) return;
  if (pipWindow) {
    pipWindow.focus();
    return;
  }
  const w = await api.requestWindow({ width: 360, height: 270 });
  w.document.title = t.miniPlayer.title;
  // Same stylesheets, and the room's mood colours and theme, which live on <html>.
  const isSheet = (n: Node): n is HTMLElement => n instanceof HTMLStyleElement || (n instanceof HTMLLinkElement && n.rel === 'stylesheet');
  for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
    w.document.head.appendChild(node.cloneNode(true));
  }
  // A theme picked while the mini player is open brings its own stylesheet.
  const sheets = new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (isSheet(n)) w.document.head.appendChild(n.cloneNode(true));
  });
  sheets.observe(document.head, { childList: true });
  const html = w.document.documentElement;
  const mirror = () => {
    const src = document.documentElement;
    html.className = src.className;
    html.lang = src.lang;
    html.setAttribute('style', src.getAttribute('style') ?? '');
    if (src.dataset.theme) html.dataset.theme = src.dataset.theme;
    else delete html.dataset.theme;
  };
  mirror();
  const observer = new MutationObserver(mirror);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  w.addEventListener('pagehide', () => {
    observer.disconnect();
    sheets.disconnect();
    setPipWindow(null);
  });
  setPipWindow(w);
}

/** The button on the now-playing card; hidden where the browser cannot do it. */
export function MiniPlayerButton() {
  const t = useT();
  const supported = useMiniPlayerSupported();
  if (!supported) return null;
  return (
    <IconButton label={t.miniPlayer.open} onClick={() => void openMiniPlayer().catch(() => {})}>
      <PictureInPicture2 className="h-5 w-5" aria-hidden />
    </IconButton>
  );
}

/** Mounted once on the room page: renders into the mini player window while it is open. */
export function MiniPlayerPortal() {
  const w = useMiniPlayerWindow();
  // Leaving the room closes the mini player with it.
  useEffect(() => () => pipWindow?.close(), []);
  if (!w) return null;
  return createPortal(
    <TimerWindowContext.Provider value={w}>
      <MiniPlayerView />
    </TimerWindowContext.Provider>,
    w.document.body,
  );
}

const REACTIONS = ['❤️', '🔥', '👏'] as const;

function MiniPlayerView() {
  const t = useT();
  const np = useNowPlaying();
  const me = useMe();
  const offset = useRoom((s) => s.offset);
  const act = useAct();
  const listening = useListening();
  const playing = np?.status === 'PLAYING';
  const now = useNow(1000, playing || Boolean(np?.skip.blockedUntil));

  if (!np) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-center text-sage">{t.nowPlaying.idleTitle}</main>
    );
  }
  const item = np.item.track;
  const pos = estimatePosition({ ...np, durationSec: item.durationSec }, offset, now);
  const picker = np.item.addedBy?.displayName;
  const canVote = Boolean(me && !me.isDevice);
  const voted = Boolean(me && np.skip.voters.includes(me.id));
  const keptSec = np.skip.blockedUntil ? Math.max(0, Math.ceil((np.skip.blockedUntil - (now + offset)) / 1000)) : 0;
  const voting = np.skip.endsAt !== null;

  return (
    <main className="flex min-h-dvh flex-col gap-2.5 p-3">
      <div className="flex items-center gap-3">
        <Thumb url={item.thumbnailUrl} size={56} className="rounded-row" />
        <div className="min-w-0 flex-1">
          <p className="type-display line-clamp-2 text-[17px] font-bold leading-tight [unicode-bidi:plaintext]" title={item.title}>
            {item.title}
          </p>
          <p className="truncate text-[12px] text-sage">{picker ? t.nowPlaying.pickedBy(picker) : addedByLabel(np.item)}</p>
        </div>
      </div>

      {item.durationSec ? (
        <div className="flex items-center gap-2 text-[11px] tabular-nums text-sage">
          <span>{formatDuration(pos)}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-dial-deep" aria-hidden>
            <div className="h-full rounded-full bg-amber" style={{ width: `${Math.min(100, (pos / item.durationSec) * 100)}%` }} />
          </div>
          <span>{formatDuration(item.durationSec)}</span>
        </div>
      ) : null}

      <SkipVote variant="pip" />

      {canVote && !me?.canPlay && (
        <div className="flex items-center gap-2">
          <ListenButton />
          {listening && <ListenVolume compact />}
        </div>
      )}

      {canVote && (
        <div className="mt-auto flex items-center gap-1.5">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={t.miniPlayer.react(emoji)}
              onClick={() => void act('room:reaction', { emoji }, { silent: true })}
              className="flex h-10 w-10 items-center justify-center rounded-row text-[20px] hover:bg-panel-hi"
            >
              {emoji}
            </button>
          ))}
          {!voting && (
            <button
              type="button"
              disabled={voted || keptSec > 0}
              onClick={() =>
                void act('queue:vote-skip', { queueItemId: np.item.id }, { optimistic: { kind: 'vote', itemId: np.item.id } })
              }
              className="ml-auto inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-row border border-line px-3 text-[13px] font-semibold hover:bg-panel-hi disabled:opacity-45"
            >
              <SkipForward className="h-4 w-4" aria-hidden />
              {keptSec > 0 ? t.nowPlaying.kept(keptSec) : t.nowPlaying.voteSkip(np.skip.votes, np.skip.required)}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

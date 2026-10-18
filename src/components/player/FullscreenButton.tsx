'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n';

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const fsDoc = () => document as FsDocument;
const fullscreenElement = () => fsDoc().fullscreenElement ?? fsDoc().webkitFullscreenElement ?? null;
/** Some embedded browsers never answer a full screen request: the page is covered instead. */
const FULLSCREEN_WAIT_MS = 800;

/**
 * Full screen for the video. The YouTube player runs without its own controls (the room stays in
 * sync), so this is the way in. Where the browser cannot put the element in full screen (iPhone,
 * some embedded browsers), it covers the page instead (`covering`, styled by the caller).
 * `active` = off while nothing plays: leaves full screen.
 */
export function useVideoFullscreen(target: React.RefObject<HTMLElement | null>, active: boolean) {
  const [native, setNative] = useState(false);
  const [covering, setCovering] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const now = target.current !== null && fullscreenElement() === target.current;
      setNative(now);
      // Real full screen arrived after all: the cover is not needed.
      if (now) setCovering(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [target]);

  const covers = covering && active;
  // The cover leaves on Esc, like real full screen.
  useEffect(() => {
    if (!covers) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCovering(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [covers]);

  // Nothing to watch any more: leave real full screen too.
  useEffect(() => {
    if (!active && target.current && fullscreenElement() === target.current) void document.exitFullscreen?.().catch(() => {});
  }, [active, target]);

  const toggle = useCallback(async () => {
    const el = target.current as FsElement | null;
    if (!el) return;
    if (covering) return setCovering(false);
    if (fullscreenElement() === el) {
      await (document.exitFullscreen?.() ?? fsDoc().webkitExitFullscreen?.());
      return;
    }
    try {
      if (!(document.fullscreenEnabled || fsDoc().webkitFullscreenEnabled)) throw new Error('no fullscreen');
      await Promise.race([el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.(), new Promise((r) => setTimeout(r, FULLSCREEN_WAIT_MS))]);
      if (fullscreenElement() !== el) throw new Error('no fullscreen');
      // Phones: a video is watched across.
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
    } catch {
      setCovering(true);
    }
  }, [target, covering]);

  return { expanded: (native && active) || covers, covers, toggle };
}

/**
 * Over the video's top right corner, small and faint: the video keeps its whole frame (no bar
 * under it, in full screen either). Always shown: the YouTube iframe swallows the pointer, so
 * "show on hover" would never show it to a mouse.
 */
export function FullscreenButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const t = useT();
  const label = expanded ? t.host.exitFullscreen : t.host.fullscreen;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={expanded}
      aria-label={label}
      title={label}
      className="video-fullscreen absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white opacity-70 transition-opacity duration-200 hover:bg-black/75 hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none"
    >
      {expanded ? <Minimize className="h-5 w-5" aria-hidden /> : <Maximize className="h-5 w-5" aria-hidden />}
    </button>
  );
}

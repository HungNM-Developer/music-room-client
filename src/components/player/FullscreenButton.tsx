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

/** Below the video (never over it: YouTube's own buttons and links stay reachable). */
export function FullscreenButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const t = useT();
  const label = expanded ? t.host.exitFullscreen : t.host.fullscreen;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={expanded}
      title={label}
      className="video-fullscreen inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-sage transition-colors hover:bg-panel-hi hover:text-paper"
    >
      {expanded ? <Minimize className="h-4 w-4" aria-hidden /> : <Maximize className="h-4 w-4" aria-hidden />}
      {label}
    </button>
  );
}

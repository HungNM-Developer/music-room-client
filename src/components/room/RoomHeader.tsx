'use client';

import { Check, History, Link2, LogOut, Palette, Share2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconButton } from '@/components/ui/Button';
import { LangSwitch } from '@/components/ui/LangSwitch';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';
import { getLang } from '@/i18n/lang';
import { shareUrl } from '@/lib/share-url';
import { useRoom } from '@/state/hooks';
import { room } from '@/state/room-store';

const ShareDialog = dynamic(() => import('./ShareDialog').then((m) => m.ShareDialog), { ssr: false });
const ThemeDialog = dynamic(() => import('@/themes/ThemePicker').then((m) => m.ThemeDialog), { ssr: false });

/** What a theme may change in the header; the buttons and their behaviour stay. */
export interface RoomHeaderSlots {
  /** Replaces the room name text (still inside the <h1>). */
  title?: React.ReactNode;
  /** Replaces the code text (still the copy-link button). */
  code?: React.ReactNode;
  /** Before the icon buttons. */
  extra?: React.ReactNode;
  /** CSS hook (`data-variant`). */
  variant?: string;
}

export function RoomHeader({ onOpenLog, title, code: codeSlot, extra, variant }: { onOpenLog: () => void } & RoomHeaderSlots) {
  const t = useT();
  const name = useRoom((s) => s.snapshot?.room.name);
  const code = useRoom((s) => s.snapshot?.room.code);
  const toast = useToast();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  if (!name || !code) return null;

  async function copyLink() {
    const url = shareUrl(window.location.origin, code ?? '', getLang());
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast(t.header.copied, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(url);
    }
  }

  return (
    <header data-variant={variant} className="room-header sticky top-0 z-40 border-b border-line/70 bg-dial/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center gap-2 px-4 py-2.5 md:px-8">
        <div className="min-w-0 flex-1">
          <h1 aria-label={title ? name : undefined} className="room-name type-display truncate text-[20px] font-bold leading-tight">
            {title ?? name}
          </h1>
          <button
            type="button"
            onClick={copyLink}
            title={t.header.copyLink}
            className="-my-2.5 -ml-1 inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-1 text-[13px] text-sage hover:text-paper"
          >
            <span className="max-sm:sr-only">{t.header.code}</span>
            {codeSlot ?? <span className="room-code type-display text-[15px] font-bold tracking-[0.12em] text-amber">{code}</span>}
            {copied ? <Check className="h-3.5 w-3.5 text-amber" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
            <span className="sr-only">{t.header.copyLink}</span>
          </button>
        </div>
        {extra}
        {/* Phones: the room name needs the room; the switch sits in the People tab instead. */}
        <LangSwitch compact className="max-sm:hidden" />
        <IconButton label={t.theme.button} onClick={() => setThemeOpen(true)}>
          <Palette className="h-5 w-5" aria-hidden />
        </IconButton>
        <IconButton label={t.share.button} onClick={() => setShareOpen(true)}>
          <Share2 className="h-5 w-5" aria-hidden />
        </IconButton>
        <IconButton label={t.header.log} onClick={onOpenLog}>
          <History className="h-5 w-5" aria-hidden />
        </IconButton>
        <IconButton
          label={t.header.leave}
          tone="danger"
          onClick={async () => {
            await room.leave();
            router.push('/');
          }}
        >
          <LogOut className="h-5 w-5" aria-hidden />
        </IconButton>
      </div>
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} />}
      {themeOpen && <ThemeDialog onClose={() => setThemeOpen(false)} />}
    </header>
  );
}
